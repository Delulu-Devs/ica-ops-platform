import { DashboardShell } from "@/components/dashboard/shell";
import { ChatWidget } from "@/components/chat-widget";
import { AuthGuard } from "@/components/auth-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
      <ChatWidget />
    </AuthGuard>
  );
}
