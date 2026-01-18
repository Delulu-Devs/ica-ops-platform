import { DashboardShell } from '@/components/dashboard/shell';
import { ChatWidget } from '@/components/chat-widget';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardShell>{children}</DashboardShell>
      <ChatWidget />
    </>
  );
}
