// Postgres 지연 초기화 (Supabase 등 범용 Postgres 호환) — DATABASE_URL 이 없을 때 빌드가 깨지지 않도록 함수 호출 시점에만 연결한다.
import 'server-only';
import postgres from 'postgres';

let _sql: ReturnType<typeof postgres> | null = null;
let tableReady: Promise<void> | null = null;

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function getSql() {
  if (!_sql) {
    _sql = postgres(process.env.DATABASE_URL!, {
      ssl: 'require',
      max: 1, // 서버리스 함수 하나당 동시 연결 최소화(Supabase 커넥션 풀러 사용 전제)
    });
  }
  return _sql;
}

/** processmap_store 테이블이 없으면 만든다. 최초 호출 시 한 번만 실행. */
export function ensureTable(): Promise<void> {
  if (!tableReady) {
    const sql = getSql();
    tableReady = sql`
      create table if not exists processmap_store (
        key text primary key,
        value jsonb not null,
        rev int not null default 1,
        updated_at timestamptz not null default now()
      )
    `.then(() => undefined);
  }
  return tableReady;
}

export { getSql };
