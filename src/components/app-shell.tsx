import { Outlet } from "@tanstack/react-router";
import { TopNav } from "@/components/top-nav";

export function AppShell({ withFooter = false, footer }: { withFooter?: boolean; footer?: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav />
      <main className="flex-1">
        <Outlet />
      </main>
      {withFooter && footer}
    </div>
  );
}
