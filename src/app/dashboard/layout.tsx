import { redirect } from 'next/navigation';
import { getSession, destroySession } from '../../lib/session';
import { Sidebar } from '../../components/ui/Sidebar';
import { Navbar } from '../../components/ui/Navbar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  async function handleLogout() {
    'use server';
    await destroySession();
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col lg:flex-row">
      {/* Sidebar Navigation */}
      <Sidebar 
        role={session.role} 
        userName={session.name} 
        onLogout={handleLogout} 
      />

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar 
          title="Dashboard Sekolah" 
          userName={session.name} 
          role={session.role} 
        />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
