import type { ReactNode } from "react";
import { PageScrollKeys } from "@/components/page-scroll-keys";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <SiteHeader />
      <main className="shell-main mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        {children}
      </main>
      <SiteFooter />
      <PageScrollKeys />
    </div>
  );
}
