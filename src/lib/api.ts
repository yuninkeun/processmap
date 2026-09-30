// 클라이언트 fetch 헬퍼 — 서버가 { error } 를 주면 Error 로 던진다.
import type { DB, Dept, Notice, NoticeKind, ProcessMap } from './types';

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    const err = new Error(data.error || `요청 실패 (${res.status})`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  state: () => req<DB>('/api/state'),
  createDept: (name: string) => req<Dept>('/api/depts', { method: 'POST', body: JSON.stringify({ name }) }),
  renameDept: (id: string, name: string) => req<Dept>(`/api/depts/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  deleteDept: (id: string) => req<{ ok: true }>(`/api/depts/${id}`, { method: 'DELETE' }),
  createMap: (deptId: string, title: string, purpose: string) =>
    req<ProcessMap>('/api/maps', { method: 'POST', body: JSON.stringify({ deptId, title, purpose }) }),
  saveMap: (map: ProcessMap, note: string, bump: boolean, force: boolean) =>
    req<{ map: ProcessMap; notified: number }>(`/api/maps/${map.id}`, {
      method: 'PUT', body: JSON.stringify({ map, note, bump, force }),
    }),
  deleteMap: (id: string) => req<{ ok: true }>(`/api/maps/${id}`, { method: 'DELETE' }),
  notify: (mapId: string, nodeId: string, kind: NoticeKind) =>
    req<Notice>('/api/notify', { method: 'POST', body: JSON.stringify({ mapId, nodeId, kind }) }),
  notifications: () => req<Notice[]>('/api/notifications'),
  seed: () => req<{ ok: true }>('/api/seed', { method: 'POST' }),
};
