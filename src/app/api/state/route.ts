// GET /api/state — 부서·맵·알림 전체를 한 번에 돌려준다 (화면 초기 로딩용)
import { NextResponse } from 'next/server';
import { readDB, storageMode } from '@/lib/server/store';
import { smtpConfigured } from '@/lib/server/mail';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = await readDB();
  return NextResponse.json({ ...db, meta: { storage: storageMode(), smtp: smtpConfigured() } });
}
