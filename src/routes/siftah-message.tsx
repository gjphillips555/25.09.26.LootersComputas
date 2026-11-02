import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ImagePlus,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  Send,
  Settings,
  Users,
} from "lucide-react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/siftah-message")({
  component: SiftahMessagePage,
  head: () => ({
    meta: [{ title: "Siftah Message · Looters Computas" }],
  }),
});

type Me = {
  userId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  shoutColor: string;
};

type Conv = {
  id: string;
  kind: string;
  title: string;
  memberCount?: number;
  lastPreview?: string;
  lastAt?: string;
  peerAvatar?: string;
};

type Msg = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  body: string;
  msgType: string;
  mediaUrl: string | null;
  shoutColor: string | null;
  expiresAt: string | null;
  createdAt: string;
  mine: boolean;
};

type SearchUser = { id: string; username: string; avatar_url: string | null };

const EMOJIS = ["😀", "😂", "🔥", "❤️", "👍", "🙏", "😎", "🥳", "💯", "👀", "💪", "🤝"];
const SHOUT_COLORS = ["#ff9a00", "#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ec4899", "#ffffff"];

function SiftahMessagePage() {
  const { user, isPending } = useCurrentUserState();
  const [me, setMe] = useState<Me | null>(null);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<"chats" | "search" | "settings" | "group">("chats");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [groupPick, setGroupPick] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState("");
  const [shoutColor, setShoutColor] = useState("#ff9a00");
  const [ttlHours, setTtlHours] = useState(24);
  const [showEmoji, setShowEmoji] = useState(false);
  const [usernameEdit, setUsernameEdit] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadMe = useCallback(async () => {
    const r = await fetch("/api/siftah-message?action=me", { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Failed to load profile");
    setMe(j.me);
    setShoutColor(j.me.shoutColor || "#ff9a00");
    setUsernameEdit(j.me.username || "");
  }, []);

  const loadInbox = useCallback(async () => {
    const r = await fetch("/api/siftah-message?action=inbox", { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Failed to load chats");
    setConvs(j.conversations || []);
    if (!activeId && j.publicId) setActiveId(j.publicId);
  }, [activeId]);

  const loadMessages = useCallback(async (id: string) => {
    const r = await fetch(
      `/api/siftah-message?action=messages&conversationId=${encodeURIComponent(id)}`,
      { cache: "no-store" },
    );
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Failed to load messages");
    setMessages(j.messages || []);
  }, []);

  useEffect(() => {
    if (isPending || !user) return;
    void (async () => {
      try {
        await loadMe();
        await loadInbox();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not open Siftah Message");
      }
    })();
  }, [isPending, user?.id, loadMe, loadInbox]);

  useEffect(() => {
    if (!activeId || !user) return;
    void loadMessages(activeId).catch((e) => setError(e.message));
    const t = window.setInterval(() => {
      void loadMessages(activeId).catch(() => undefined);
      void loadInbox().catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(t);
  }, [activeId, user?.id, loadMessages, loadInbox]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeId]);

  async function searchUsers(q: string) {
    setQuery(q);
    if (q.trim().length < 1) {
      setResults([]);
      return;
    }
    const r = await fetch(`/api/siftah-message?action=search&q=${encodeURIComponent(q.trim())}`);
    const j = await r.json();
    if (r.ok) setResults(j.users || []);
  }

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/siftah-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Request failed");
      return j;
    } finally {
      setBusy(false);
    }
  }

  async function startDirect(userId: string) {
    const j = await post({ action: "start_direct", userId });
    setActiveId(j.conversationId);
    setPanel("chats");
    await loadInbox();
    await loadMessages(j.conversationId);
  }

  async function createGroup() {
    if (!groupPick.length) return;
    const j = await post({
      action: "start_group",
      title: groupTitle || "Group",
      userIds: groupPick,
    });
    setGroupPick([]);
    setGroupTitle("");
    setActiveId(j.conversationId);
    setPanel("chats");
    await loadInbox();
  }

  async function sendText() {
    if (!activeId || !text.trim()) return;
    await post({
      action: "send",
      conversationId: activeId,
      body: text.trim(),
      msgType: "text",
      ttlHours,
    });
    setText("");
    setShowEmoji(false);
    await loadMessages(activeId);
    await loadInbox();
  }

  async function sendShout() {
    if (!activeId) return;
    await post({
      action: "send",
      conversationId: activeId,
      body: "🗣️",
      msgType: "shout",
      shoutColor,
      ttlHours,
    });
    await loadMessages(activeId);
  }

  async function onPickMedia(file: File | null) {
    if (!file || !activeId) return;
    if (file.size > 600_000) {
      setError("Image must be under ~600KB.");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    const isGif = file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");
    await post({
      action: "send",
      conversationId: activeId,
      body: isGif ? "gif" : "image",
      msgType: isGif ? "gif" : "image",
      mediaUrl: dataUrl,
      ttlHours,
    });
    await loadMessages(activeId);
  }

  async function saveSettings() {
    await post({
      action: "update_profile",
      username: usernameEdit.trim(),
      shoutColor,
      avatarUrl: me?.avatarUrl || null,
    });
    await loadMe();
    setPanel("chats");
  }

  async function onAvatarFile(file: File | null) {
    if (!file) return;
    if (file.size > 600_000) {
      setError("Avatar must be under ~600KB.");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    await post({ action: "update_profile", username: usernameEdit.trim(), shoutColor, avatarUrl: dataUrl });
    await loadMe();
  }

  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-sm text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Siftah Message</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in with your Looters / Siftah account to message other members. Encrypted at rest,
          disappearing by default — minimal tracking.
        </p>
        <Link
          to="/login"
          search={{ callbackURL: "/siftah-message" }}
          className="mt-6 inline-flex rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white"
        >
          Sign in to open messenger
        </Link>
      </main>
    );
  }

  const active = convs.find((c) => c.id === activeId);

  return (
    <main className="mx-auto flex h-[calc(100dvh-4rem)] max-w-6xl flex-col overflow-hidden border-x border-border bg-background sm:h-[calc(100dvh-5rem)]">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <MessageCircle className="size-5 text-red-500" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-black tracking-wide">Siftah Message</h1>
          <p className="truncate text-[11px] text-muted-foreground">
            Encrypted · disappearing · {me?.username ? `@${me.username}` : "set a username"}
          </p>
        </div>
        <button type="button" onClick={() => setPanel("search")} className="rounded-lg border border-border p-2" aria-label="Search users">
          <Search className="size-4" />
        </button>
        <button type="button" onClick={() => setPanel("group")} className="rounded-lg border border-border p-2" aria-label="New group">
          <Users className="size-4" />
        </button>
        <button type="button" onClick={() => setPanel("settings")} className="rounded-lg border border-border p-2" aria-label="Settings">
          <Settings className="size-4" />
        </button>
      </header>

      {error && (
        <p className="border-b border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500" role="alert">
          {error}
        </p>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className={`${panel !== "chats" || !activeId ? "flex" : "hidden sm:flex"} w-full flex-col border-r border-border sm:w-80 sm:max-w-[40%]`}>
          {panel === "chats" && (
            <div className="flex-1 overflow-y-auto">
              {convs.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActiveId(c.id);
                    setPanel("chats");
                  }}
                  className={`flex w-full items-center gap-3 border-b border-border px-3 py-3 text-left hover:bg-secondary/50 ${
                    activeId === c.id ? "bg-secondary/70" : ""
                  }`}
                >
                  <Avatar url={c.peerAvatar} name={c.title} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{c.title}</span>
                      {c.kind === "public" && (
                        <span className="rounded bg-red-500/20 px-1.5 text-[10px] font-bold text-red-400">OPEN</span>
                      )}
                      {c.kind === "group" && (
                        <span className="rounded bg-blue-500/20 px-1.5 text-[10px] font-bold text-blue-400">GROUP</span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{c.lastPreview || "—"}</span>
                  </span>
                </button>
              ))}
              {!convs.length && (
                <p className="p-4 text-sm text-muted-foreground">No chats yet — search a member or join the open room.</p>
              )}
            </div>
          )}

          {panel === "search" && (
            <div className="flex flex-1 flex-col gap-2 p-3">
              <button type="button" className="text-left text-xs text-muted-foreground" onClick={() => setPanel("chats")}>
                ← Back to chats
              </button>
              <input
                value={query}
                onChange={(e) => void searchUsers(e.target.value)}
                placeholder="Find members by username…"
                className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
                autoFocus
              />
              <div className="flex-1 overflow-y-auto">
                {results.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void startDirect(u.id).catch((e) => setError(e.message))}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-secondary"
                  >
                    <Avatar url={u.avatar_url} name={u.username} />
                    <span className="text-sm font-semibold">{u.username}</span>
                  </button>
                ))}
                {query && !results.length && (
                  <p className="p-2 text-xs text-muted-foreground">No members matched.</p>
                )}
              </div>
            </div>
          )}

          {panel === "group" && (
            <div className="flex flex-1 flex-col gap-2 p-3">
              <button type="button" className="text-left text-xs text-muted-foreground" onClick={() => setPanel("chats")}>
                ← Back
              </button>
              <h2 className="text-sm font-bold">New group chat</h2>
              <input
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                placeholder="Group name"
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
              <input
                value={query}
                onChange={(e) => void searchUsers(e.target.value)}
                placeholder="Search members to add…"
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-1">
                {groupPick.map((id) => (
                  <span key={id} className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                    {results.find((r) => r.id === id)?.username || id.slice(0, 6)}
                  </span>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto">
                {results.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() =>
                      setGroupPick((ids) =>
                        ids.includes(u.id) ? ids.filter((x) => x !== u.id) : [...ids, u.id],
                      )
                    }
                    className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left ${
                      groupPick.includes(u.id) ? "bg-red-500/15" : "hover:bg-secondary"
                    }`}
                  >
                    <Avatar url={u.avatar_url} name={u.username} />
                    <span className="text-sm">{u.username}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={busy || !groupPick.length}
                onClick={() => void createGroup().catch((e) => setError(e.message))}
                className="rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                Create group
              </button>
            </div>
          )}

          {panel === "settings" && (
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
              <button type="button" className="text-left text-xs text-muted-foreground" onClick={() => setPanel("chats")}>
                ← Back
              </button>
              <h2 className="text-sm font-bold">Account settings</h2>
              <p className="text-xs text-muted-foreground">
                Only username, avatar and shout colour are stored for messaging. No message content analytics.
              </p>
              <div className="flex items-center gap-3">
                <Avatar url={me?.avatarUrl || null} name={me?.displayName || "?"} large />
                <label className="cursor-pointer rounded-lg border border-border px-3 py-2 text-xs font-semibold">
                  Upload avatar
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void onAvatarFile(e.target.files?.[0] || null).catch((err) => setError(err.message))}
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold">
                Username (change anytime)
                <input
                  value={usernameEdit}
                  onChange={(e) => setUsernameEdit(e.target.value)}
                  maxLength={24}
                  placeholder="letters_numbers"
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <div>
                <p className="mb-1 text-xs font-semibold">Shout colour (🗣️ quick react)</p>
                <div className="flex flex-wrap gap-2">
                  {SHOUT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setShoutColor(c)}
                      className={`size-8 rounded-full border-2 ${
                        shoutColor === c ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ background: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
              <label className="block text-xs font-semibold">
                Default disappear after (hours)
                <select
                  value={ttlHours}
                  onChange={(e) => setTtlHours(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value={1}>1 hour</option>
                  <option value={6}>6 hours</option>
                  <option value={24}>24 hours</option>
                  <option value={72}>3 days</option>
                  <option value={168}>7 days</option>
                  <option value={0}>Never (not recommended)</option>
                </select>
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveSettings().catch((e) => setError(e.message))}
                className="rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                Save settings
              </button>
              <Link to="/account" className="text-center text-xs text-muted-foreground underline">
                Marketplace account / PayPal
              </Link>
            </div>
          )}
        </aside>

        {/* Thread */}
        <section className={`${!activeId ? "hidden sm:flex" : "flex"} min-w-0 flex-1 flex-col`}>
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <button type="button" className="text-xs text-muted-foreground sm:hidden" onClick={() => setActiveId(null)}>
              Chats
            </button>
            <h2 className="truncate text-sm font-bold">{active?.title || "Siftah Message"}</h2>
            {active?.kind === "public" && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Everyone</span>
            )}
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {!activeId && (
              <p className="py-12 text-center text-sm text-muted-foreground">Pick a chat or search for a member.</p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.mine ? "bg-red-600 text-white" : "bg-secondary text-foreground"
                  }`}
                >
                  {!m.mine && (
                    <p className="mb-0.5 text-[10px] font-semibold opacity-70">{m.senderName}</p>
                  )}
                  {m.msgType === "shout" ? (
                    <span className="inline-block text-4xl leading-none" style={{ filter: `drop-shadow(0 0 0 ${m.shoutColor || "#ff9a00"})` }}>
                      <span style={{ color: m.shoutColor || "#ff9a00" }}>🗣️</span>
                    </span>
                  ) : m.mediaUrl ? (
                    <img src={m.mediaUrl} alt="" className="max-h-56 rounded-lg" />
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  )}
                  <p className={`mt-1 text-[10px] ${m.mine ? "text-white/60" : "text-muted-foreground"}`}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {m.expiresAt ? " · disappears" : ""}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {activeId && (
            <div className="border-t border-border p-2 sm:p-3">
              {showEmoji && (
                <div className="mb-2 flex flex-wrap gap-1 rounded-xl border border-border bg-card p-2">
                  {EMOJIS.map((e) => (
                    <button key={e} type="button" className="text-xl" onClick={() => setText((t) => t + e)}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-1.5">
                <button
                  type="button"
                  title="Shout (like a thumbs-up)"
                  onClick={() => void sendShout().catch((e) => setError(e.message))}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border text-xl"
                  style={{ color: shoutColor }}
                >
                  🗣️
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmoji((v) => !v)}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border text-lg"
                >
                  ☺
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border"
                  aria-label="Attach image"
                >
                  <ImagePlus className="size-4" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.gif"
                  className="hidden"
                  onChange={(e) => {
                    void onPickMedia(e.target.files?.[0] || null).catch((err) => setError(err.message));
                    e.target.value = "";
                  }}
                />
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendText().catch((err) => setError(err.message));
                    }
                  }}
                  rows={1}
                  placeholder="Message… (disappears by default)"
                  className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
                />
                <button
                  type="button"
                  disabled={busy || !text.trim()}
                  onClick={() => void sendText().catch((e) => setError(e.message))}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white disabled:opacity-40"
                  aria-label="Send"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Avatar({ url, name, large }: { url: string | null | undefined; name: string; large?: boolean }) {
  const size = large ? "size-14" : "size-10";
  if (url) {
    return <img src={url} alt="" className={`${size} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-red-500/20 text-sm font-bold text-red-400`}>
      {(name || "?")[0]?.toUpperCase()}
    </span>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
