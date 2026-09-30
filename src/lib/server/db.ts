// Neon Postgres 지연 초기화 — DATABASE_URL 이 없을 때 빌드가 깨지지 않도록 함수 호출 시점에만 연결한다.
import 'server-only';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let _sql: NeonQueryFunction<false, false> | null = null;
let tableReady: Promise<void> | null = null;

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function getSql(): NeonQueryFunction<false, false> {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return _sql;
}

/** app_store 테이블이 없으면 만든다. 최초 호출 시 한 번만 실행. */
export function ensureTable(): Promise<void> {
  if (!tableReady) {
    const sql = getSql();
    tableReady = sql`
      create table if not exists app_store (
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
