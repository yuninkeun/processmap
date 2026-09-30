// 저장소 (서버 전용). DATABASE_URL 이 있으면 Postgres(Supabase 등)에 영구 저장하고,
// 없으면 data/db.json 파일에 저장하되 쓰기가 불가능한 환경(Vercel 등)이면 메모리 저장으로 전환한다.
import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';
import { emptyDB, type DB } from '../types';
import { hasDatabase, ensureTable, getSql } from './db';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const STORE_KEY = 'main';

function normalize(raw: Partial<DB> | null | undefined): DB {
  const db = emptyDB();
  if (raw && Array.isArray(raw.depts)) db.depts = raw.depts;
  if (raw && Array.isArray(raw.maps)) db.maps = raw.maps;
  if (raw && Array.isArray(raw.notices)) db.notices = raw.notices;
  return db;
}

// ---------- Postgres 경로 (DATABASE_URL 있을 때) ----------

/** 읽기 → 변경 → 쓰기를 낙관적 동시성 제어(rev)로 수행한다. 충돌 시 재시도(최대 5회). */
async function mutatePg<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  await ensureTable();
  const sql = getSql();
  for (let attempt = 0; attempt < 5; attempt++) {
    const rows = await sql`select value, rev from processmap_store where key = ${STORE_KEY}`;
    const row = rows[0] as { value: unknown; rev: number } | undefined;
    const db = normalize((row?.value as Partial<DB>) ?? null);
    const rev = row?.rev ?? 0;

    const result = await fn(db);

    if (rev === 0) {
      // 최초 저장
      await sql`
        insert into processmap_store (key, value, rev, updated_at)
        values (${STORE_KEY}, ${JSON.stringify(db)}::jsonb, 1, now())
        on conflict (key) do nothing
      `;
      const check = await sql`select rev from processmap_store where key = ${STORE_KEY}`;
      if ((check[0] as { rev: number } | undefined)?.rev === 1) return result;
      continue; // 동시에 다른 요청이 먼저 insert함 — 재시도
    }

    const updated = await sql`
      update processmap_store set value = ${JSON.stringify(db)}::jsonb, rev = rev + 1, updated_at = now()
      where key = ${STORE_KEY} and rev = ${rev}
    `;
    if (updated.count > 0) return result;
    // rev 불일치 — 다른 요청이 먼저 씀. 다시 읽어서 재시도.
  }
  throw new Error('저장 충돌이 반복돼 반영하지 못했습니다. 잠시 후 다시 시도해주세요.');
}

async function readDBPg(): Promise<DB> {
  await ensureTable();
  const sql = getSql();
  const rows = await sql`select value from processmap_store where key = ${STORE_KEY}`;
  const row = rows[0] as { value: unknown } | undefined;
  return normalize((row?.value as Partial<DB>) ?? null);
}

// ---------- 파일/메모리 경로 (DATABASE_URL 없을 때, 로컬 개발용) ----------

let memory: DB | null = null;
let memoryOnly = false;
let queue: Promise<unknown> = Promise.resolve();

async function readDBFile(): Promise<DB> {
  if (memoryOnly && memory) return structuredClone(memory);
  try {
    const txt = await fs.readFile(DB_PATH, 'utf8');
    const db = normalize(JSON.parse(txt));
    memory = db;
    return structuredClone(db);
  } catch {
    return structuredClone(memory || emptyDB());
  }
}

async function writeDBFile(db: DB): Promise<void> {
  memory = structuredClone(db);
  if (memoryOnly) return;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = DB_PATH + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), 'utf8');
    await fs.rename(tmp, DB_PATH);
  } catch {
    memoryOnly = true;
    console.warn('[store] data/db.json 에 쓸 수 없어 메모리 저장으로 전환합니다.');
  }
}

function mutateFile<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = async () => {
    const db = await readDBFile();
    const result = await fn(db);
    await writeDBFile(db);
    return result;
  };
  const p = queue.then(run, run);
  queue = p.catch(() => undefined);
  return p;
}

// ---------- 공개 API ----------

export function readDB(): Promise<DB> {
  return hasDatabase() ? readDBPg() : readDBFile();
}

/** 읽기 → 변경 → 쓰기를 한 번에 수행한다. fn 이 반환한 값을 그대로 돌려준다. */
export function mutate<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  return hasDatabase() ? mutatePg(fn) : mutateFile(fn);
}

/** 저장 방식 안내용 (비밀값 없음) */
export const storageMode = () => (hasDatabase() ? 'postgres' : memoryOnly ? 'memory' : 'file');
