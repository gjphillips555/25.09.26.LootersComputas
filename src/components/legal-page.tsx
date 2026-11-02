import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { BrandLogoCrossfade } from "@/components/brand-logo-crossfade";
import { LegalLinks } from "@/components/legal-links";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <AppShell>
      <article className="mx-auto max-w-3xl py-6 sm:py-10">
        <div className="mb-6 rounded-2xl bg-black px-4 py-8 sm:py-10">
          <BrandLogoCrossfade heightClass="h-28 sm:h-36" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#ff9a00]">
          Looters Computas · Siftah
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
        <div className="legal-copy mt-8 space-y-6 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
          {children}
        </div>
        <div className="mt-10 border-t border-border pt-6">
          <LegalLinks />
        </div>
      </article>
    </AppShell>
  );
}
