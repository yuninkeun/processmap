'use client';
// 공통 모달: 배경 클릭·Esc 로 닫힘, 첫 입력란에 자동 포커스, Enter 로 기본 동작
import { useEffect, useRef } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  onSubmit?: () => void;
  children: React.ReactNode;
  actions: React.ReactNode;
}

export function Modal({ title, onClose, onSubmit, children, actions }: Props) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const f = box.current?.querySelector<HTMLElement>('input:not([type=checkbox]),textarea,select');
    f?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={box}
        onKeyDown={(e) => {
          const t = e.target as HTMLElement;
          if (e.key === 'Enter' && onSubmit && t.tagName === 'INPUT' && (t as HTMLInputElement).type !== 'checkbox') { e.preventDefault(); onSubmit(); }
        }}>
        <h2>{title}</h2>
        {children}
        <div className="acts">{actions}</div>
      </div>
    </div>
  );
}
