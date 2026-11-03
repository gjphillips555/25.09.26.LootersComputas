import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, MessageCircle, Search, Send, Settings, Shield, Users } from "lucide-react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  currentNotifyPermission,
  ensureNotifyPermission,
  playPffftSound,
  showPrivateMessageNotification,
} from "@/lib/siftah-message/notify";

export const Route = createFileRoute("/siftah-message")({
  component: SiftahMessagePage,
  head: () => ({ meta: [{ title: "Siftah Message · Looters Computas" }] }),
});

type Me = { userId: string; username: string | null; displayName: string; avatarUrl: string | null; shoutColor: string };
type Conv = { id: string; kind: string; title: string; memberCount?: number; lastPreview?: string; lastAt?: string; peerAvatar?: string };
type Msg = { id: string; senderId: string; senderName: string; senderAvatar: string | null; body: string; msgType: string; mediaUrl: string | null; shoutColor: string | null; expiresAt: string | null; createdAt: string; mine: boolean };
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
  const [ttlHours, setTtlHours] = useState(6);
  const [showEmoji, setShowEmoji] = useState(false);
  const [usernameEdit, setUsernameEdit] = useState("");
  const [screenShield, setScreenShield] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [notifyPerm, setNotifyPerm] = useState<string>("default");
  const seenMsgIdsRef = useRef<Set<string>>(new Set());
  const primedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotifyPerm(currentNotifyPermission());
    try {
      if (localStorage.getItem("sm-notify") === "0") setNotifyEnabled(false);
    } catch { /* ok */ }
  }, []);

  useEffect(() => {
    const sync = () => setScreenShield(document.hidden || document.visibilityState === "hidden");
    const onBlur = () => setScreenShield(true);
    const onFocus = () => { if (!document.hidden) setScreenShield(false); };
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    sync();
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    const block = (e: Event) => e.preventDefault();
    el.addEventListener("contextmenu", block);
    el.addEventListener("dragstart", block);
    return () => { el.removeEventListener("contextmenu", block); el.removeEventListener("dragstart", block); };
  }, [activeId, user?.id]);

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
    const r = await fetch(`/api/siftah-message?action=messages&conversationId=${encodeURIComponent(id)}`, { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Failed to load messages");
    const list: Msg[] = j.messages || [];
    if (primedRef.current && notifyEnabled) {
      let fresh = 0;
      for (const m of list) {
        if (!m.mine && !seenMsgIdsRef.current.has(m.id)) fresh += 1;
      }
      if (fresh > 0) {
        playPffftSound();
        if (document.hidden || !document.hasFocus()) {
          showPrivateMessageNotification(fresh);
        }
      }
    }
    for (const m of list) seenMsgIdsRef.current.add(m.id);
    primedRef.current = true;
    setMessages(list);
  }, [notifyEnabled]);

  useEffect(() => {
    if (isPending || !user) return;
    void (async () => {
      try { await loadMe(); await loadInbox(); }
      catch (e) { setError(e instanceof Error ? e.message : "Could not open Siftah Message"); }
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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, activeId]);

  async function searchUsers(q: string) {
    setQuery(q);
    if (q.trim().length < 1) { setResults([]); return; }
    const r = await fetch(`/api/siftah-message?action=search&q=${encodeURIComponent(q.trim())}`);
    const j = await r.json();
    if (r.ok) setResults(j.users || []);
  }

  async function post(body: Record<string, unknown>) {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/siftah-message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Request failed");
      return j;
    } finally { setBusy(false); }
  }

  async function startDirect(userId: string) {
    const j = await post({ action: "start_direct", userId });
    setActiveId(j.conversationId); setPanel("chats");
    await loadInbox(); await loadMessages(j.conversationId);
  }

  async function createGroup() {
    if (!groupPick.length) return;
    const j = await post({ action: "start_group", title: groupTitle || "Group", userIds: groupPick });
    setGroupPick([]); setGroupTitle(""); setActiveId(j.conversationId); setPanel("chats");
    await loadInbox();
  }

  async function sendText() {
    if (!activeId || !text.trim()) return;
    await post({ action: "send", conversationId: activeId, body: text.trim(), msgType: "text", ttlHours });
    setText(""); setShowEmoji(false);
    await loadMessages(activeId); await loadInbox();
  }

  async function sendShout() {
    if (!activeId) return;
    await post({ action: "send", conversationId: activeId, body: "🗣️", msgType: "shout", shoutColor, ttlHours });
    await loadMessages(activeId);
  }

  async function deleteMessage(id: string) {
    await post({ action: "delete_message", messageId: id });
    if (activeId) await loadMessages(activeId);
  }

  async function onPickMedia(file: File | null) {
    if (!file || !activeId) return;
    if (file.size > 600_000) { setError("Image must be under ~600KB."); return; }
    const dataUrl = await readFileAsDataUrl(file);
    const isGif = file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");
    await post({ action: "send", conversationId: activeId, body: isGif ? "gif" : "image", msgType: isGif ? "gif" : "image", mediaUrl: dataUrl, ttlHours });
    await loadMessages(activeId);
  }

  async function saveSettings() {
    await post({ action: "update_profile", username: usernameEdit.trim(), shoutColor, avatarUrl: me?.avatarUrl || null });
    await loadMe(); setPanel("chats");
  }

  async function onAvatarFile(file: File | null) {
    if (!file) return;
    if (file.size > 600_000) { setError("Avatar must be under ~600KB."); return; }
    const dataUrl = await readFileAsDataUrl(file);
    await post({ action: "update_profile", username: usernameEdit.trim(), shoutColor, avatarUrl: dataUrl });
    await loadMe();
  }

  if (isPending) return (<main className="grid min-h-dvh place-items-center p-6 text-sm text-muted-foreground"><Loader2 className="size-6 animate-spin" /></main>);

  if (!user) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Siftah Message</h1>
        <p className="mt-3 text-sm text-muted-foreground">Temporary chats between members. Messages auto-delete from our servers after 6 hours by default.</p>
        <Link to="/login" search={{ callbackURL: "/siftah-message" }} className="mt-6 inline-flex rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white">Sign in to open messenger</Link>
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
          <p className="truncate text-[11px] text-muted-foreground">6h auto-delete · screen shield · {me?.username ? `@${me.username}` : "set a username"}</p>
        </div>
        <button type="button" onClick={() => setPanel("search")} className="rounded-lg border border-border p-2" aria-label="Search"><Search className="size-4" /></button>
        <button type="button" onClick={() => setPanel("group")} className="rounded-lg border border-border p-2" aria-label="Group"><Users className="size-4" /></button>
        <button type="button" onClick={() => setPanel("settings")} className="rounded-lg border border-border p-2" aria-label="Settings"><Settings className="size-4" /></button>
      </header>

      {error && <p className="border-b border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500" role="alert">{error}</p>}

      <div className="flex min-h-0 flex-1">
        <aside className={`${panel !== "chats" || !activeId ? "flex" : "hidden sm:flex"} w-full flex-col border-r border-border sm:w-80 sm:max-w-[40%]`}>
          {panel === "chats" && (
            <div className="flex-1 overflow-y-auto">
              {convs.map((c) => (
                <button key={c.id} type="button" onClick={() => { setActiveId(c.id); setPanel("chats"); }}
                  className={`flex w-full items-center gap-3 border-b border-border px-3 py-3 text-left hover:bg-secondary/50 ${activeId === c.id ? "bg-secondary/70" : ""}`}>
                  <Avatar url={c.peerAvatar} name={c.title} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{c.title}</span>
                      {c.kind === "public" && <span className="rounded bg-red-500/20 px-1.5 text-[10px] font-bold text-red-400">OPEN</span>}
                      {c.kind === "group" && <span className="rounded bg-blue-500/20 px-1.5 text-[10px] font-bold text-blue-400">GROUP</span>}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{c.lastPreview || "—"}</span>
                  </span>
                </button>
              ))}
              {!convs.length && <p className="p-4 text-sm text-muted-foreground">No chats yet — search a member or join the open room.</p>}
            </div>
          )}

          {panel === "search" && (
            <div className="flex flex-1 flex-col gap-2 p-3">
              <button type="button" className="text-left text-xs text-muted-foreground" onClick={() => setPanel("chats")}>← Back</button>
              <input value={query} onChange={(e) => void searchUsers(e.target.value)} placeholder="Find members…" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm" autoFocus />
              <div className="flex-1 overflow-y-auto">
                {results.map((u) => (
                  <button key={u.id} type="button" disabled={busy} onClick={() => void startDirect(u.id).catch((e) => setError(e.message))}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-secondary">
                    <Avatar url={u.avatar_url} name={u.username} />
                    <span className="text-sm font-semibold">{u.username}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {panel === "group" && (
            <div className="flex flex-1 flex-col gap-2 p-3">
              <button type="button" className="text-left text-xs text-muted-foreground" onClick={() => setPanel("chats")}>← Back</button>
              <h2 className="text-sm font-bold">New group</h2>
              <input value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} placeholder="Group name" className="rounded-xl border border-input bg-background px-3 py-2 text-sm" />
              <input value={query} onChange={(e) => void searchUsers(e.target.value)} placeholder="Search members…" className="rounded-xl border border-input bg-background px-3 py-2 text-sm" />
              <div className="flex-1 overflow-y-auto">
                {results.map((u) => (
                  <button key={u.id} type="button" onClick={() => setGroupPick((ids) => ids.includes(u.id) ? ids.filter((x) => x !== u.id) : [...ids, u.id])}
                    className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left ${groupPick.includes(u.id) ? "bg-red-500/15" : "hover:bg-secondary"}`}>
                    <Avatar url={u.avatar_url} name={u.username} /><span className="text-sm">{u.username}</span>
                  </button>
                ))}
              </div>
              <button type="button" disabled={busy || !groupPick.length} onClick={() => void createGroup().catch((e) => setError(e.message))} className="rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">Create group</button>
            </div>
          )}

          {panel === "settings" && (
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
              <button type="button" className="text-left text-xs text-muted-foreground" onClick={() => setPanel("chats")}>← Back</button>
              <h2 className="text-sm font-bold">Account settings</h2>
              <div className="flex items-center gap-3">
                <Avatar url={me?.avatarUrl || null} name={me?.displayName || "?"} large />
                <label className="cursor-pointer rounded-lg border border-border px-3 py-2 text-xs font-semibold">Upload avatar
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => void onAvatarFile(e.target.files?.[0] || null).catch((err) => setError(err.message))} />
                </label>
              </div>
              <label className="block text-xs font-semibold">Username
                <input value={usernameEdit} onChange={(e) => setUsernameEdit(e.target.value)} maxLength={24} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
              </label>
              <div>
                <p className="mb-1 text-xs font-semibold">Shout colour</p>
                <div className="flex flex-wrap gap-2">
                  {SHOUT_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setShoutColor(c)} className={`size-8 rounded-full border-2 ${shoutColor === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ background: c }} />
                  ))}
                </div>
              </div>
              <label className="block text-xs font-semibold">Default disappear after
                <select value={ttlHours} onChange={(e) => setTtlHours(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                  <option value={1}>1 hour</option>
                  <option value={6}>6 hours (default)</option>
                  <option value={24}>24 hours</option>
                  <option value={72}>3 days</option>
                  <option value={168}>7 days</option>
                </select>
              </label>

              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs font-semibold">Notifications</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Alerts only say “New message received” (and a count). Message text is never shown in the notification.
                </p>
                <label className="mt-2 flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={notifyEnabled}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setNotifyEnabled(on);
                      try { localStorage.setItem("sm-notify", on ? "1" : "0"); } catch { /* ok */ }
                      if (on) {
                        void ensureNotifyPermission().then((p) => setNotifyPerm(p));
                        playPffftSound();
                      }
                    }}
                  />
                  Enable pffft alerts
                </label>
                {notifyEnabled && notifyPerm !== "granted" && notifyPerm !== "unsupported" && (
                  <button type="button" className="mt-2 rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold"
                    onClick={() => void ensureNotifyPermission().then((p) => setNotifyPerm(p))}>
                    Allow system notifications
                  </button>
                )}
                {notifyPerm === "denied" && (
                  <p className="mt-1 text-[10px] text-muted-foreground">System notifications blocked — sound still works while this tab is open.</p>
                )}
              </div>

              <div className="rounded-xl border border-border bg-secondary/40 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold"><Shield className="size-4 text-red-500" />For the most secure use of Siftah Message</div>
                <ol className="list-decimal space-y-1.5 pl-4 text-[11px] leading-relaxed text-muted-foreground">
                  <li><strong className="text-foreground">Turn off notification previews</strong> so message text never appears on the lock screen.</li>
                  <li><strong className="text-foreground">Do not screenshot</strong> and ask the other person not to.</li>
                  <li><strong className="text-foreground">Delete messages when done</strong>, or wait for auto-delete (default 6 hours).</li>
                  <li>Siftah alerts never include message text — only “New message received” and a count.</li>
                </ol>
              </div>

              <button type="button" disabled={busy} onClick={() => void saveSettings().catch((e) => setError(e.message))} className="rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">Save settings</button>
              <Link to="/account" className="text-center text-xs text-muted-foreground underline">Marketplace account / PayPal</Link>
            </div>
          )}
        </aside>

        <section className={`${!activeId ? "hidden sm:flex" : "flex"} min-w-0 flex-1 flex-col`}>
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <button type="button" className="text-xs text-muted-foreground sm:hidden" onClick={() => setActiveId(null)}>Chats</button>
            <h2 className="truncate text-sm font-bold">{active?.title || "Siftah Message"}</h2>
            <span className="ml-auto hidden items-center gap-1 text-[10px] text-muted-foreground sm:inline-flex"><Shield className="size-3" /> Shield on</span>
          </div>

          <div ref={threadRef} className="relative flex-1 space-y-2 overflow-y-auto px-3 py-3 select-none" style={{ WebkitUserSelect: "none", userSelect: "none" }}>
            {screenShield && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background" aria-hidden="true">
                <div className="max-w-[14rem] text-center text-xs text-muted-foreground">
                  <Shield className="mx-auto mb-2 size-6 text-red-500" />
                  Screen shield active — return to this tab to view messages
                </div>
              </div>
            )}
            {!activeId && <p className="py-12 text-center text-sm text-muted-foreground">Pick a chat or search for a member.</p>}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.mine ? "bg-red-600 text-white" : "bg-secondary text-foreground"}`}>
                  {!m.mine && <p className="mb-0.5 text-[10px] font-semibold opacity-70">{m.senderName}</p>}
                  {m.msgType === "shout" ? (
                    <span className="inline-block text-4xl leading-none"><span style={{ color: m.shoutColor || "#ff9a00" }}>🗣️</span></span>
                  ) : m.mediaUrl ? (
                    <img src={m.mediaUrl} alt="" className="max-h-56 rounded-lg pointer-events-none" draggable={false} />
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  )}
                  <p className={`mt-1 flex items-center gap-2 text-[10px] ${m.mine ? "text-white/60" : "text-muted-foreground"}`}>
                    <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{m.expiresAt ? " · disappears" : ""}</span>
                    {m.mine && <button type="button" className="underline opacity-80 hover:opacity-100" onClick={() => void deleteMessage(m.id).catch((e) => setError(e.message))}>Delete</button>}
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
                  {EMOJIS.map((e) => <button key={e} type="button" className="text-xl" onClick={() => setText((t) => t + e)}>{e}</button>)}
                </div>
              )}
              <div className="flex items-end gap-1.5">
                <button type="button" title="Shout" onClick={() => void sendShout().catch((e) => setError(e.message))} className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border text-xl" style={{ color: shoutColor }}>🗣️</button>
                <button type="button" onClick={() => setShowEmoji((v) => !v)} className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border text-lg">☺</button>
                <button type="button" onClick={() => fileRef.current?.click()} className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border" aria-label="Attach"><ImagePlus className="size-4" /></button>
                <input ref={fileRef} type="file" accept="image/*,.gif" className="hidden" onChange={(e) => { void onPickMedia(e.target.files?.[0] || null).catch((err) => setError(err.message)); e.target.value = ""; }} />
                <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendText().catch((err) => setError(err.message)); } }} rows={1} placeholder="Message… (auto-deletes from our servers)" className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
                <button type="button" disabled={busy || !text.trim()} onClick={() => void sendText().catch((e) => setError(e.message))} className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white disabled:opacity-40" aria-label="Send">{busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}</button>
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
  if (url) return <img src={url} alt="" className={`${size} shrink-0 rounded-full object-cover`} draggable={false} />;
  return <span className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-red-500/20 text-sm font-bold text-red-400`}>{(name || "?")[0]?.toUpperCase()}</span>;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
