// 루트 레이아웃: 폰트·메타·전역 상태(데이터/토스트) + 사이드바 셸
import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import './globals.css';
import { DataProvider } from '@/components/DataProvider';
import { ToastProvider } from '@/components/Toast';
import { Shell } from '@/components/Shell';

const noto = Noto_Sans_KR({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-noto', display: 'swap' });

export const metadata: Metadata = {
  title: '프로세스맵 — 부서별 업무 절차·진행 현황',
  description: '업무 프로세스맵을 정의하고 주관부서·담당자·납기를 지정해 진행 STATUS를 모니터링합니다.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={noto.variable}>
      <body>
        <ToastProvider>
          <DataProvider>
            <Shell>{children}</Shell>
          </DataProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
