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
  { id: "general", name: "General", desc: "Site news, introductions, anything goes" },
  { id: "marketplace", name: "Marketplace", desc: "Deals, swaps, gear talk" },
  { id: "siftah", name: "Siftah", desc: "AI models, credits, tips" },
  { id: "3d", name: "3D Prints", desc: "Blueprints, filament, prints" },
  { id: "arcade", name: "Arcade", desc: "Games and high scores" },
  { id: "offtopic", name: "Off-topic", desc: "Everything else" },
];

const TOPICS = [
  { id: "t1", cat: "general", title: "Welcome to the Looters forum", author: "Looters", replies: 12, preview: "Introduce yourself and say what you're hunting for." },
  { id: "t2", cat: "general", title: "Site updates — PayPal + Siftah Credits", author: "Admin", replies: 4, preview: "Credits and payments are live. Feedback welcome." },
  { id: "t3", cat: "marketplace", title: "Best local swaps this week", author: "KiwiTrader", replies: 8, preview: "Got a spare GPU and looking for a laptop." },
  { id: "t4", cat: "marketplace", title: "How to avoid scams on deals", author: "Moderator", replies: 15, preview: "Always use PayPal Goods & Services." },
  { id: "t5", cat: "siftah", title: "Which model for coding?", author: "DexterFan", replies: 6, preview: "Dexter vs Super Saiyan for Python help." },
  { id: "t6", cat: "siftah", title: "Credits wallet tips", author: "SiftahUser", replies: 3, preview: "Buy in bulk, it lasts longer." },
  { id: "t7", cat: "3d", title: "Free blueprints from Looters", author: "PrintMaster", replies: 9, preview: "New files added to the 3D section." },
  { id: "t8", cat: "3d", title: "Best filament for NZ weather", author: "MakerNZ", replies: 5, preview: "PETG holds up better in the humidity." },
  { id: "t9", cat: "arcade", title: "Favourite arcade game?", author: "Gamer", replies: 11, preview: "Still addicted to the browser classics." },
  { id: "t10", cat: "offtopic", title: "What are you building?", author: "Builder", replies: 7, preview: "Share your latest project." },
];

function DenForum() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [data, setData] = useState<Awaited<ReturnType<typeof denForum>> | null>(null);
  const [me, setMe] = useState<Awaited<ReturnType<typeof denMe>> | null>(null);
  const [activeCat, setActiveCat] = useState<string | null>(null);

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
      <main className="den-shell">
        <div className="den-card">
          <h1>Sign in to continue</h1>
          <p>Use the same Looters Computas / Siftah account.</p>
          <a href="/login?callbackURL=%2Fhidden%2Fforum">Sign in / Create account</a>
        </div>
      </main>
    );
  }

  if (!me || !data) return <main className="den-shell">loading…</main>;

  if (me.role === "user" && me.user?.status !== "approved") {
    return (
      <main className="den-shell">
        <div className="den-card">
          <h1>Entrant</h1>
          <p>You are in the waiting room. You cannot view the den until Looters approves you.</p>
          <Link to="/">back to the shop</Link>
        </div>
      </main>
    );
  }

  const topics = activeCat ? TOPICS.filter((t) => t.cat === activeCat) : TOPICS;

  return (
    <main className="den-shell den-forum">
      <div className="den-card den-wide space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1>Looters Forum</h1>
          <button type="button" onClick={() => void signOut()} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary">
            Log out
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setActiveCat(null)} className={`rounded-full px-3 py-1 text-xs font-semibold ${!activeCat ? "bg-red-600 text-white" : "bg-secondary"}`}>
            All
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" onClick={() => setActiveCat(c.id)} className={`rounded-full px-3 py-1 text-xs font-semibold ${activeCat === c.id ? "bg-red-600 text-white" : "bg-secondary"}`}>
              {c.name}
            </button>
          ))}
        </div>

        <section>
          <h2 className="text-sm font-bold mb-2">Topics</h2>
          <ul className="space-y-2">
            {topics.map((t) => (
              <li key={t.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <b className="text-sm">{t.title}</b>
                  <span className="text-[11px] text-muted-foreground">{t.replies} replies</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t.preview}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">by {t.author} · {CATEGORIES.find((c) => c.id === t.cat)?.name}</p>
              </li>
            ))}
          </ul>
        </section>

        {data.role === "admin" && (
          <section className="mt-4">
            <h2 className="text-sm font-bold">Admin · approve</h2>
            <ul className="den-pending">
              {data.pending.map((u) => (
                <li key={u.id}>
                  <span>{u.username} · {u.email} · {u.status}</span>
                  {u.status === "entrant" && (
                    <span className="den-actions">
                      <button type="button" onClick={async () => { await denApprove({ data: { id: u.id, allow: true } }); await reload(); }}>Approve</button>
                      <button type="button" onClick={async () => { await denApprove({ data: { id: u.id, allow: false } }); await reload(); }}>Reject</button>
                    </span>
                  )}
                </li>
              ))}
              {data.pending.length === 0 && <li>No pending.</li>}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
