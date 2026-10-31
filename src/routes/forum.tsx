import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { createForumPost, createForumTopic, deleteForumPost, getForumThread, getForumTopics } from "@/lib/forum";

export const Route = createFileRoute("/forum")({ component: ForumPage });

type Topics = Awaited<ReturnType<typeof getForumTopics>>;
type Thread = Awaited<ReturnType<typeof getForumThread>>;

const categories = ["General", "Help & Support", "Hardware", "Software", "Buying & Selling", "Showcase"] as const;

function ForumPage() {
  const { user, isPending } = useCurrentUserState();
  const [topics, setTopics] = useState<Topics>([]);
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("General");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try { setTopics(await getForumTopics()); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load the forum."); }
    finally { setLoading(false); }
  }
  async function openThread(id: string) {
    setError("");
    try { setThread(await getForumThread({ data: { topicId: id } })); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not open this discussion."); }
  }
  useEffect(() => { if (user) void refresh(); }, [user?.id]);

  async function publishTopic(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const result = await createForumTopic({ data: { title, category, body } });
      setTitle(""); setBody(""); setShowComposer(false);
      await refresh(); await openThread(result.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not publish topic."); }
    finally { setBusy(false); }
  }
  async function publishReply(e: React.FormEvent) {
    e.preventDefault(); if (!thread) return;
    setBusy(true); setError("");
    try {
      await createForumPost({ data: { topicId: thread.topic.id, body: reply } });
      setReply(""); await openThread(thread.topic.id); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not post reply."); }
    finally { setBusy(false); }
  }

  if (isPending) return <AppShell><div className="py-16 text-center text-muted-foreground">Checking your Looters account…</div></AppShell>;
  if (!user) return <AppShell><section className="mx-auto my-12 max-w-xl rounded-2xl border border-border bg-card p-8 text-center"><h1 className="text-3xl font-bold">LootersComputas Forum</h1><p className="mt-3 text-muted-foreground">The community forum is for signed-in members. Sign in with your Google account to read, start discussions and reply.</p><Link to="/login" className="mt-6 inline-flex rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white">Sign into LootersComputas</Link></section></AppShell>;

  return <AppShell>
    <div className="mx-auto max-w-4xl py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-orange-500">Member community</p><h1 className="mt-1 text-3xl font-black sm:text-4xl">LootersComputas Forum</h1><p className="mt-2 text-sm text-muted-foreground">Ask questions, share builds, talk hardware and help other members.</p></div>
        <button onClick={() => { setThread(null); setShowComposer(v => !v); }} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-600">{showComposer ? "Close" : "＋ Start a discussion"}</button>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>Signed in as {user.displayName ?? user.primaryEmail}</span><span>{topics.length} discussions</span></div>
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
      {showComposer && <form onSubmit={publishTopic} className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-xl font-bold">Start a discussion</h2>
        <input value={title} onChange={e => setTitle(e.target.value)} minLength={5} maxLength={120} required placeholder="Discussion title" className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm" />
        <select value={category} onChange={e => setCategory(e.target.value as typeof category)} className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm">{categories.map(c => <option key={c}>{c}</option>)}</select>
        <textarea value={body} onChange={e => setBody(e.target.value)} minLength={10} maxLength={8000} required rows={5} placeholder="What would you like to discuss?" className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm" />
        <button disabled={busy} className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Publishing…" : "Publish discussion"}</button>
      </form>}
      {thread ? <section className="mt-6">
        <button onClick={() => setThread(null)} className="mb-4 text-sm font-semibold text-orange-500">← Back to discussions</button>
        <article className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-orange-500">{thread.topic.category}</p>
          <h2 className="mt-2 text-2xl font-bold">{thread.topic.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">Started by {thread.topic.author_name} · {new Date(thread.topic.created_at).toLocaleString()}</p>
          <div className="mt-5 space-y-4">{thread.posts.map((post, index) => <div key={post.id} className="border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2">{post.author_image ? <img src={post.author_image} alt="" className="size-8 rounded-full" /> : <span className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-bold">{String(post.author_name).slice(0,1)}</span>}<div><p className="text-sm font-semibold">{post.author_name}</p><p className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString()}</p></div></div>
              {post.user_id === user.id && index > 0 && <button onClick={async () => { if (confirm("Delete your reply?")) { await deleteForumPost({ data: { postId: post.id } }); await openThread(thread.topic.id); await refresh(); } }} className="text-xs text-red-500">Delete</button>}
            </div><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{post.body}</p>
          </div>)}</div>
        </article>
        {!thread.topic.is_locked && <form onSubmit={publishReply} className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-5"><h3 className="font-bold">Reply to this discussion</h3><textarea value={reply} onChange={e => setReply(e.target.value)} minLength={2} maxLength={8000} required rows={4} placeholder="Write your reply…" className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm" /><button disabled={busy} className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Posting…" : "Post reply"}</button></form>}
      </section> : <div className="mt-6 space-y-3">{loading ? <p className="py-12 text-center text-muted-foreground">Loading discussions…</p> : topics.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-10 text-center"><h2 className="text-xl font-bold">Be the first to start a discussion</h2><p className="mt-2 text-sm text-muted-foreground">Your community forum is ready for its first post.</p></div> : topics.map(topic => <button key={topic.id} onClick={() => void openThread(topic.id)} className="w-full rounded-2xl border border-border bg-card p-5 text-left transition hover:border-orange-500/60">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[11px] font-bold uppercase tracking-wider text-orange-500">{topic.category}</span><span className="text-xs text-muted-foreground">{topic.reply_count} replies</span></div>
        <h2 className="mt-2 text-lg font-bold">{topic.title}</h2><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{topic.latest_body}</p><p className="mt-3 text-xs text-muted-foreground">Started by {topic.author_name} · Latest reply by {topic.latest_author ?? topic.author_name} · {new Date(topic.updated_at).toLocaleString()}</p>
      </button>)}</div>}
    </div>
  </AppShell>;
}
