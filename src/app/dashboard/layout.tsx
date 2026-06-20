import { redirect } from 'next/navigation';
import { getSession } from '@/server/api';
import { Sidebar } from './_components/Sidebar';
import { TopBar } from './_components/TopBar';
import { BottomStatusBar } from './_components/BottomStatusBar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar quyen={session.quyen} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar session={session} />
        <main className="flex-1 overflow-y-auto bg-slate-50 scrollbar-thin">
          {children}
        </main>
        <BottomStatusBar />
      </div>
    </div>
  );
}
