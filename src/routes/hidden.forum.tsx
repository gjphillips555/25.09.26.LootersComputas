import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { denApprove, denForum, denMe } from "@/lib/den";
import { authEnabled, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/hidden/forum")({
  component: DenForum,
  head: () => ({ meta: [{ title: "Forum · Looters Computas" }] }),
});

const CATEGORIES = [
  { id: "general", name: "General", desc: "Site news, introductions, anything goes", color: "bg-red-500" },
  { id: "marketplace", name: "Marketplace", desc: "Deals, swaps, gear talk", color: "bg-orange-500" },
  { id: "siftah", name: "Siftah", desc: "AI models, credits, tips", color: "bg-purple-500" },
  { id: "3d", name: "3D Prints", desc: "Blueprints, filament, prints", color: "bg-blue-500" },
  { id: "arcade", name: "Arcade", desc: "Games and high scores", color: "bg-green-500" },
  { id: "offtopic", name: "Off-topic", desc: "Everything else", color: "bg-zinc-500" },
];

const TOPICS = [
  { id: "t1", cat: "general", title: "Welcome to the Looters forum", author: "Looters", replies: 12, views: 148, last: "2h ago", preview: "Introduce yourself and say what you're hunting for." },
  { id: "t2", cat: "general", title: "Site updates — PayPal + Siftah Credits", author: "Admin", replies: 4, views: 89, last: "5h ago", preview: "Credits and payments are live. Feedback welcome." },
  { id: "t3", cat: "marketplace", title: "Best local swaps this week", author: "KiwiTrader", replies: 8, views: 67, last: "1h ago", preview: "Got a spare GPU and looking for a laptop." },
  { id: "t4", cat: "marketplace", title: "How to avoid scams on deals", author: "Moderator", replies: 15, views: 203, last: "30m ago", preview: "Always use PayPal Goods & Services." },
  { id: "t5", cat: "siftah", title: "Which model for coding?", author: "DexterFan", replies: 6, views: 54, last: "3h ago", preview: "Dexter vs Super Saiyan for Python help." },
  { id: "t6", cat: "siftah", title: "Credits wallet tips", author: "SiftahUser", replies: 3, views: 41, last: "8h ago", preview: "Buy in bulk, it lasts longer." },
  { id: "t7", cat: "3d", title: "Free blueprints from Looters", author: "PrintMaster", replies: 9, views: 112, last: "45m ago", preview: "New files added to the 3D section." },
  { id: "t8", cat: "3d", title: "Best filament for NZ weather", author: "MakerNZ", replies: 5, views: 78, last: "2h ago", preview: "PETG holds up better in the humidity." },
  { id: "t9", cat: "arcade", title: "Favourite arcade game?", author: "Gamer", replies: 11, views: 96, last: "1h ago", preview: "Still addicted to the browser classics." },
  { id: "t10", cat: "offtopic", title: "What are you building?", author: "Builder", replies: 7, views: 63, last: "4h ago", preview: "Share your latest project." },
];

function DenForum() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [data, setData] = useState<Awaited<ReturnType<typeof denForum>> | null>(null);
  const [me, setMe] = useState<Awaited<ReturnType<typeof denMe>> | null>(null);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function reload() {
    const [who, board] = await Promise.all([denMe(), denForum()]);
    setMe(who);
    setData(board);
    if (who.role === "none") void navigate({ to: "/hidden" });
  }

  useEffect(() => {
    if (user) void reload();
  }, [user]);

  if (authEnabled && (isPending || !user)) {
    return (
      <main className="min-h-dvh bg-background p-6">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-center">
          <h1 className="text-xl font-bold">Sign in to continue</h1>
          <p className="mt-2 text-sm text-muted-foreground">Use the same Looters Computas / Siftah account.</p>
          <a href="/login?callbackURL=%2Fhidden%2Fforum" className="mt-4 inline-flex rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white">Sign in</a>
        </div>
      </main>
    );
  }

  if (!me || !data) return <main className="min-h-dvh bg-background p-6">Loading forum…</main>;

  if (me.role === "user" && me.user?.status !== "approved") {
    return (
      <main className="min-h-dvh bg-background p-6">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-center">
          <h1 className="text-xl font-bold">Waiting for approval</h1>
          <p className="mt-2 text-sm text-muted-foreground">You need approval before viewing the forum.</p>
          <Link to="/" className="mt-4 inline-block text-sm underline">Back to shop</Link>
        </div>
      </main>
    );
  }

  const topics = TOPICS.filter((t) => {
    if (activeCat && t.cat !== activeCat) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.preview.toLowerCase().includes(q) || t.author.toLowerCase().includes(q);
  });
  const cat = CATEGORIES.find((c) => c.id === activeCat);

  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-black">Looters Forum</h1>
            <p className="text-xs text-muted-foreground">Discussions · marketplace · Siftah · 3D · arcade</p>
          </div>
          <button type="button" onClick={() => void signOut()} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary">
            Log out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-5">
        <div className="mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics…"
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
          />
        </div>
        <div className="mb-5 grid gap-2 sm:grid-cols-3">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCat(activeCat === c.id ? null : c.id)}
              className={`rounded-xl border p-3 text-left transition ${activeCat === c.id ? "border-red-500 bg-red-500/10" : "border-border bg-card hover:bg-secondary/50"}`}
            >
              <div className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${c.color}`} />
                <span className="text-sm font-bold">{c.name}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-bold">{cat ? cat.name : "All topics"}</h2>
            <span className="text-xs text-muted-foreground">{topics.length} topics</span>
          </div>
          <ul className="divide-y divide-border">
            {topics.map((t) => (
              <li key={t.id} className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/40">
                <div className="mt-0.5 size-8 shrink-0 rounded-full bg-secondary text-center text-xs font-bold leading-8 text-muted-foreground">
                  {t.author[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.preview}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t.author} · {CATEGORIES.find((c) => c.id === t.cat)?.name}
                  </p>
                </div>
                <div className="shrink-0 text-right text-[11px] text-muted-foreground">
                  <p>{t.replies} replies</p>
                  <p>{t.views} views</p>
                  <p className="mt-0.5">{t.last}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {data.role === "admin" && (
          <section className="mt-6 rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-2 text-sm font-bold">Admin · approve</h2>
            <ul className="space-y-2 text-sm">
              {data.pending.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-2">
                  <span>{u.username} · {u.email} · {u.status}</span>
                  {u.status === "entrant" && (
                    <span className="flex gap-1">
                      <button type="button" onClick={async () => { await denApprove({ data: { id: u.id, allow: true } }); await reload(); }} className="rounded border border-border px-2 py-1 text-xs">Approve</button>
                      <button type="button" onClick={async () => { await denApprove({ data: { id: u.id, allow: false } }); await reload(); }} className="rounded border border-border px-2 py-1 text-xs">Reject</button>
                    </span>
                  )}
                </li>
              ))}
              {data.pending.length === 0 && <li className="text-muted-foreground">No pending.</li>}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
