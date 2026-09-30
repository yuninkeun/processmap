'use client';
// 화면 아래 짧은 안내 메시지
import { createContext, useCallback, useContext, useRef, useState } from 'react';

const Ctx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(''), 3200);
  }, []);
  return (
    <Ctx.Provider value={toast}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
