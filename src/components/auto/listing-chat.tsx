import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Clock, Flag, Loader2, MessagesSquare, Phone, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { autoApi } from "@/components/auto/auto-ui";
import { ChatAvatar, signInHref } from "@/components/siftah/site-chat-panes";
import { connectRealtime } from "@/lib/site-chat/realtime";
import { LISTING_CHAT_TTL_HOURS } from "@/lib/auto/shared";

type Msg = { id: number; senderId: string; body: string; createdAt: string; sender: { id: string; name: string; image: string | null } };
type ChatState = {
  enabled: boolean;
  open: boolean;
  sellerId: string;
  viewer: { id: string | null; isAdmin: boolean; isSeller: boolean };
  messages: Msg[];
  realtime: { url: string; key: string; topic: string } | null;
};

const TTL_MS = LISTING_CHAT_TTL_HOURS * 3600_000;
const minsLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() + TTL_MS - Date.now()) / 60000));
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** "Show number" tap-to-reveal for a listing's mobile (kept out of page HTML). */
export function ShowPhone({ listingId }: { listingId: string }) {
  const [phone, setPhone] = useState<{ phone: string; tel: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (phone) {
    return (
      <a href={`tel:${phone.tel}`} className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#0b0b0c] px-4 py-2 text-sm font-bold" data-testid="phone-number">
        <Phone className="size-4" /> {phone.phone}
      </a>
    );
  }
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const { ok, data } = await autoApi<{ phone: string; tel: string }>(`/api/auto/listings?op=phone&id=${encodeURIComponent(listingId)}`);
        setBusy(false);
        if (!ok) return toast.error(data.error || "Couldn't show the number");
        setPhone(data);
      }}
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#0b0b0c] px-4 py-2 text-sm font-bold"
      data-testid="show-phone"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Phone className="size-4" />} Show number
    </button>
  );
}

/** Public live chat about one vehicle, at the bottom of its listing page. Messages delete after 2 hours. */
export function ListingChat({ listingId }: { listingId: string }) {
  const [st, setSt] = useState<ChatState | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState(false);
  const [, tick] = useState(0);
  const lastId = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (full = false) => {
    const after = full ? 0 : lastId.current;
    const { ok, data } = await autoApi<ChatState>(`/api/auto/listing-chat?id=${encodeURIComponent(listingId)}&after=${after}`);
    if (!ok) return;
    setSt((prev) => {
      const base = full || !prev ? [] : prev.messages;
      const map = new Map(base.map((m) => [m.id, m]));
      for (const m of data.messages) map.set(m.id, m);
      const messages = [...map.values()].sort((a, b) => a.id - b.id).filter((m) => minsLeft(m.createdAt) > 0);
      lastId.current = messages.length ? messages[messages.length - 1].id : lastId.current;
      return { ...data, messages };
    });
  }, [listingId]);

  useEffect(() => {
    void load(true);
    // Poll as a fallback (fast while visible); a full refresh every minute picks up deletions.
    let n = 0;
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      n += 1;
      void load(n % 15 === 0);
    }, live ? 20_000 : 4_000);
    // Re-render every 30 s so expired messages drop off and countdowns update.
    const e = setInterval(() => {
      tick((x) => x + 1);
      setSt((prev) => (prev ? { ...prev, messages: prev.messages.filter((m) => minsLeft(m.createdAt) > 0) } : prev));
    }, 30_000);
    return () => {
      clearInterval(t);
      clearInterval(e);
    };
  }, [load, live]);

  const rtKey = st?.realtime ? `${st.realtime.url}|${st.realtime.topic}` : "";
  useEffect(() => {
    const rt = st?.realtime;
    if (!rt) return;
    const h = connectRealtime({
      url: rt.url,
      apiKey: rt.key,
      topics: [rt.topic],
      onStatus: setLive,
      onEvent: (_t, event, payload) => {
        if (event === "del" && typeof payload.id === "number") {
          setSt((prev) => (prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== payload.id) } : prev));
        } else void load();
      },
    });
    return () => h.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rtKey]);

  const count = st?.messages.length ?? 0;
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);

  if (!st || !st.enabled) return null;

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    const { ok, data } = await autoApi("/api/auto/listing-chat", { body: { action: "send", id: listingId, body } });
    setSending(false);
    if (!ok) return toast.error(data.error || "Couldn't send");
    setText("");
    void load();
  };
  const act = async (action: "delete" | "report", m: Msg) => {
    if (action === "report" && !window.confirm("Report this message to the seller and admins?")) return;
    const { ok, data } = await autoApi("/api/auto/listing-chat", { body: { action, messageId: m.id } });
    if (!ok) return toast.error(data.error || "Couldn't do that");
    if (action === "delete") setSt((prev) => (prev ? { ...prev, messages: prev.messages.filter((x) => x.id !== m.id) } : prev));
    else toast.success("Thanks, reported");
  };

  const v = st.viewer;
  return (
    <section className="mt-10 max-w-3xl" id="live-chat" data-testid="listing-chat">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 font-display text-2xl"><MessagesSquare className="size-6 text-[#e3121b]" /> Live chat about this vehicle</h2>
        <p className="inline-flex items-center gap-1 text-xs font-bold text-[#55555c]">
          <span className={`size-2 rounded-full ${live ? "bg-[#5cc8f2]" : "bg-[#22c55e]"}`} /> Public · messages delete after {LISTING_CHAT_TTL_HOURS} hours
        </p>
      </div>
      <div className="mt-3 overflow-hidden rounded-2xl border-2 border-[#0b0b0c] bg-white text-[#0b0b0c]">
        <div ref={listRef} className="max-h-[26rem] min-h-[8rem] space-y-3 overflow-y-auto p-4" data-testid="listing-chat-messages">
          {st.messages.length === 0 && <p className="py-6 text-center text-sm text-[#55555c]">No messages in the last {LISTING_CHAT_TTL_HOURS} hours. Ask the seller something!</p>}
          {st.messages.map((m) => {
            const seller = m.senderId === st.sellerId;
            const mine = m.senderId === v.id;
            return (
              <div key={m.id} className="group flex gap-2.5" data-testid="listing-chat-message">
                <ChatAvatar user={m.sender} className="size-8" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-bold">{m.sender.name}</span>
                    {seller && <span className="rounded-full bg-[#e3121b] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white" data-testid="seller-badge">Seller</span>}
                    <span className="text-[#55555c]">{timeOf(m.createdAt)}</span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-[#55555c]" title="Time until this message is deleted"><Clock className="size-3" />{minsLeft(m.createdAt)}m</span>
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{m.body}</p>
                </div>
                <div className="flex shrink-0 items-start gap-1 opacity-70 group-hover:opacity-100">
                  {(mine || v.isSeller || v.isAdmin) && (
                    <button type="button" onClick={() => void act("delete", m)} aria-label="Delete message" className="rounded-full p-1.5 hover:bg-black/5"><Trash2 className="size-3.5" /></button>
                  )}
                  {v.id && !mine && (
                    <button type="button" onClick={() => void act("report", m)} aria-label="Report message" className="rounded-full p-1.5 hover:bg-black/5"><Flag className="size-3.5" /></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t-2 border-[#0b0b0c] p-3">
          {!st.open ? (
            <p className="text-center text-sm text-[#55555c]">Chat is closed for this listing.</p>
          ) : v.id ? (
            <form onSubmit={send} className="flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} placeholder={v.isSeller ? "Reply as the seller…" : "Ask about this vehicle…"} className="h-11 min-w-0 flex-1 rounded-full border border-black/15 px-4 text-sm" data-testid="listing-chat-input" />
              <button type="submit" disabled={sending || !text.trim()} className="inline-flex items-center gap-1.5 rounded-full bg-[#e3121b] px-4 text-sm font-bold text-white disabled:opacity-50" data-testid="listing-chat-send">
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send
              </button>
            </form>
          ) : (
            <a href={signInHref()} className="block rounded-full bg-[#0b0b0c] py-2.5 text-center text-sm font-bold text-white">Sign in to join the chat</a>
          )}
          <p className="mt-2 text-[11px] text-[#55555c]">Anyone can read this chat. Don't post personal details; messages are deleted after {LISTING_CHAT_TTL_HOURS} hours.</p>
        </div>
      </div>
    </section>
  );
}
