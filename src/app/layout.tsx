import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ToastContainer } from '@/shared/components';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'EduRecruit - Hệ thống tuyển dụng viên chức',
  description: 'Hệ thống quản lý tuyển dụng viên chức - Sở GDĐT Lạng Sơn',
  robots: 'noindex, nofollow'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={inter.className}>
      <body>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
