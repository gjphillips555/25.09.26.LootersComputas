import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMyLootPoints } from "@/lib/forum";

export const Route = createFileRoute("/loot-points")({ component: LootPointsPage });
type Points = Awaited<ReturnType<typeof getMyLootPoints>>;

function LootPointsPage() {
  const { user, isPending } = useCurrentUserState();
  const [points, setPoints] = useState<Points | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!user) return;
    void getMyLootPoints().then(setPoints).catch(e => setError(e instanceof Error ? e.message : "Could not load points."));
  }, [user?.id]);
  return <AppShell><div className="mx-auto max-w-3xl py-10">
    <p className="text-xs font-bold uppercase tracking-[.2em] text-orange-500">Member rewards</p>
    <h1 className="mt-2 text-4xl font-black">Loot Points</h1>
    <p className="mt-3 max-w-2xl text-muted-foreground">Your community contribution score. Earn points by taking part in the LootersComputas forum. For now, points simply accumulate in your account while we work on partner rewards.</p>
    {isPending ? <p className="mt-8 text-muted-foreground">Checking your account…</p> : !user ? <section className="mt-8 rounded-2xl border border-border bg-card p-6"><p>Sign in with Google to see and collect your Loot Points.</p><Link to="/login" className="mt-4 inline-flex rounded-xl bg-orange-500 px-5 py-3 font-bold text-white">Sign into LootersComputas</Link></section> : <>
      <section className="mt-8 rounded-2xl border border-orange-500/30 bg-card p-7"><p className="text-sm font-semibold text-muted-foreground">Your current balance</p><p className="mt-2 text-5xl font-black tabular-nums text-orange-500">{points?.balance.toLocaleString() ?? "—"} <span className="text-xl">LP</span></p><p className="mt-3 text-xs text-muted-foreground">Loot Points have no cash value and cannot currently be redeemed, transferred or used in games.</p></section>
      <section className="mt-8 rounded-2xl border border-border bg-card p-6"><h2 className="text-xl font-bold">How to earn</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-secondary/50 p-4"><p className="text-2xl font-black text-orange-500">+10 LP</p><p className="mt-1 text-sm font-semibold">Start a discussion</p></div><div className="rounded-xl bg-secondary/50 p-4"><p className="text-2xl font-black text-orange-500">+2 LP</p><p className="mt-1 text-sm font-semibold">Reply to a discussion</p></div></div><p className="mt-3 text-xs text-muted-foreground">Forum earning is capped at 50 points per day to discourage spam. Slots and games do not award points.</p><Link to="/forum" className="mt-5 inline-flex rounded-xl bg-orange-500 px-5 py-3 font-bold text-white">Visit the forum</Link></section>
      <section className="mt-8"><h2 className="text-xl font-bold">Points history</h2>{error && <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}<div className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">{points?.history.length ? points.history.map((entry,i)=><div key={i} className="flex items-center justify-between gap-4 p-4"><div><p className="text-sm font-semibold">{entry.reason}</p><p className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</p></div><strong className="text-orange-500">+{entry.points} LP</strong></div>) : <p className="p-5 text-sm text-muted-foreground">No points earned yet. Join a discussion to get started.</p>}</div></section>
    </>}
  </div></AppShell>;
}
