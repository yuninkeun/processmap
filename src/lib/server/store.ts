// JSON 파일 저장소 (서버 전용). data/db.json 에 저장하고, 쓰기가 불가능한 환경(Vercel 등)이면 메모리 저장으로 전환한다.
import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';
import { emptyDB, type DB } from '../types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

// 메모리 폴백 + 순차 처리(동시 쓰기 꼬임 방지)
let memory: DB | null = null;
let memoryOnly = false;
let queue: Promise<unknown> = Promise.resolve();

function normalize(raw: Partial<DB> | null | undefined): DB {
  const db = emptyDB();
  if (raw && Array.isArray(raw.depts)) db.depts = raw.depts;
  if (raw && Array.isArray(raw.maps)) db.maps = raw.maps;
  if (raw && Array.isArray(raw.notices)) db.notices = raw.notices;
  return db;
}

export async function readDB(): Promise<DB> {
  if (memoryOnly && memory) return structuredClone(memory);
  try {
    const txt = await fs.readFile(DB_PATH, 'utf8');
    const db = normalize(JSON.parse(txt));
    memory = db;
    return structuredClone(db);
  } catch {
    // 파일이 없으면 빈 DB (메모리에 있으면 그것을 사용)
    return structuredClone(memory || emptyDB());
  }
}

async function writeDB(db: DB): Promise<void> {
  memory = structuredClone(db);
  if (memoryOnly) return;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = DB_PATH + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), 'utf8');
    await fs.rename(tmp, DB_PATH);
  } catch {
    // 읽기 전용 파일시스템 등 — 이후부터 메모리 저장으로 동작 (값·경로만 남기고 비밀값 없음)
    memoryOnly = true;
    console.warn('[store] data/db.json 에 쓸 수 없어 메모리 저장으로 전환합니다.');
  }
}

/** 읽기 → 변경 → 쓰기를 한 번에, 순차적으로 수행한다. fn 이 반환한 값을 그대로 돌려준다. */
export function mutate<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = async () => {
    const db = await readDB();
    const result = await fn(db);
    await writeDB(db);
    return result;
  };
  const p = queue.then(run, run);
  queue = p.catch(() => undefined);
  return p;
}

/** 저장 방식 안내용 (비밀값 없음) */
export const storageMode = () => (memoryOnly ? 'memory' : 'file');
