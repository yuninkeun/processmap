// GET /api/notifications — 알림 내역 (최신순)
import { NextResponse } from 'next/server';
import { readDB } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = await readDB();
  const list = [...db.notices].sort((a, b) => b.at.localeCompare(a.at));
  return NextResponse.json(list);
}
