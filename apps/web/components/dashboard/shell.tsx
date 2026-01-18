'use client';

import { Header } from './header';
import { Sidebar } from './sidebar';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-muted/20 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
