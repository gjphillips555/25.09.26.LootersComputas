import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { denApprove, denForum, denMe } from "@/lib/den";
import { authEnabled, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/forum")({
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
];

function DenForum() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [category, setCategory] = useState("general");
  const [topics, setTopics] = useState(TOPICS);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");

  useEffect(() => {
    if (authEnabled && !isPending && !user) {
      void navigate({ to: "/login", search: { callbackURL: "/forum" } });
    }
  }, [authEnabled, isPending, user, navigate]);

  const filtered = topics.filter((t) => t.cat === category);

  function post() {
    if (!newTitle.trim()) return;
    const topic = {
      id: "t" + Date.now(),
      cat: category,
      title: newTitle.trim(),
      author: user?.displayName || user?.primaryEmail || "You",
      replies: 0,
      views: 1,
      last: "just now",
      preview: newBody.trim() || "New topic",
    };
    setTopics((prev) => [topic, ...prev]);
    setNewTitle("");
    setNewBody("");
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">Forum</h1>
      <p className="mt-1 text-sm text-muted-foreground">Community den for Looters Computas</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${category === c.id ? "bg-foreground text-background" : "bg-secondary"}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {filtered.map((t) => (
          <article key={t.id} className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-semibold">{t.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.preview}</p>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{t.author}</span>
              <span>·</span>
              <span>{t.replies} replies</span>
              <span>·</span>
              <span>{t.views} views</span>
              <span>·</span>
              <span>{t.last}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold">Start a topic</h3>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Title"
          className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <textarea
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          placeholder="What's on your mind?"
          rows={3}
          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <button type="button" onClick={post} className="mt-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background">
          Post
        </button>
      </div>
    </main>
  );
}
