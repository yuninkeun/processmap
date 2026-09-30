'use client';
// 전역 데이터: /api/state 를 한 번 불러와 모든 화면이 공유한다. 변경 후에는 refresh() 로 다시 불러온다.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { DB, Dept, ProcessMap } from '@/lib/types';
import { emptyDB } from '@/lib/types';

interface Meta { storage: 'postgres' | 'file' | 'memory'; smtp: boolean }

interface DataCtx {
  db: DB;
  meta: Meta;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  q: string;
  setQ: (q: string) => void;
  deptById: (id: string) => Dept | undefined;
  mapById: (id: string) => ProcessMap | undefined;
  mapsOf: (deptId: string) => ProcessMap[];
}

const Ctx = createContext<DataCtx | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(emptyDB());
  const [meta, setMeta] = useState<Meta>({ storage: 'file', smtp: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (!res.ok) throw new Error(`불러오기 실패 (${res.status})`);
      const data = (await res.json()) as DB & { meta?: Meta };
      setDb({ depts: data.depts || [], maps: data.maps || [], notices: data.notices || [] });
      if (data.meta) setMeta(data.meta);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // 최초 1회 불러오기 (외부 시스템(API) 구독 — 상태 갱신은 응답 콜백에서 일어난다)
  useEffect(() => { queueMicrotask(() => { void refresh(); }); }, [refresh]);

  const value = useMemo<DataCtx>(() => {
    const depts = [...db.depts].sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name, 'ko'));
    return {
      db: { ...db, depts }, meta, loading, error, refresh, q, setQ,
      deptById: (id) => depts.find((d) => d.id === id),
      mapById: (id) => db.maps.find((m) => m.id === id),
      mapsOf: (deptId) => db.maps.filter((m) => m.deptId === deptId).sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ko')),
    };
  }, [db, meta, loading, error, refresh, q]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error('DataProvider 안에서만 사용할 수 있습니다.');
  return v;
}
