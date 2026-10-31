import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/arcade")({ component: ArcadePage });

function ArcadePage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-orange-500">Looters gaming hub</p>
        <h1 className="mt-2 text-4xl font-black sm:text-5xl">Arcade Games</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">A growing collection of free browser games, playable right here on LootersComputas.</p>
        <section className="mt-8 rounded-2xl border border-orange-500/30 bg-card p-6 sm:p-8">
          <h2 className="text-2xl font-bold">Playgama Arcade</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">We’re preparing the embedded Playgama game catalogue. Games are served by Playgama, so LootersComputas does not need to host the game files. The partner widget must be created in our Playgama partner account so its unique tracking ID and embed code attribute plays and eligible revenue to LootersComputas.</p>
          <div className="mt-6 rounded-xl border border-dashed border-border bg-secondary/30 p-6">
            <p className="font-semibold">Arcade integration awaiting partner widget</p>
            <p className="mt-2 text-sm text-muted-foreground">Create a widget in the Playgama Partners dashboard, then add its generated embed code here. A generic widget ID would not credit the LootersComputas partner account.</p>
            <a href="https://playgama.com/partners" target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-600">Set up LootersComputas on Playgama ↗</a>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">Free-to-play games. Ads and in-game purchases are handled by the game provider under its partner programme terms.</p>
        </section>
      </main>
    </AppShell>
  );
}
