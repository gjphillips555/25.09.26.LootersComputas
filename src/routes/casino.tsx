import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/casino")({ component: CasinoPage });

function CasinoPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-orange-500">Separate gaming area</p>
        <h1 className="mt-2 text-4xl font-black sm:text-5xl">Gambling Games</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">A separate destination for casino-style games, independent from the marketplace and its payment systems.</p>
        <section className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-2xl font-bold">Casino integrations are not active</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">We’ll only embed real-money games after securing a written agreement with an authorised operator and confirming that the operator, games, payments and promotion are permitted in each country where they are offered.</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">No deposits, wagers, withdrawals or real-money games are available here at present. LootersComputas does not accept or hold gambling funds.</p>
        </section>
      </main>
    </AppShell>
  );
}
