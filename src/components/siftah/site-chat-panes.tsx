import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Ban, LogIn, MessageCircle, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChatUser, InboxItem, Me } from "@/lib/site-chat/use-site-chat";

export const MAX_LEN = 500;

export function signInHref() {
  if (typeof window === "undefined") return "/login";
  return `/login?callbackURL=${encodeURIComponent(window.location.pathname + window.location.search)}`;
}

export function ChatAvatar({ user, className, online }: { user: ChatUser; className?: string; online?: boolean }) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {user.image ? (
        <img src={user.image} alt="" referrerPolicy="no-referrer" className="size-full rounded-full object-cover" />
      ) : (
        <span className="inline-flex size-full items-center justify-center rounded-full bg-[#e3121b] font-display text-sm text-white">
          {user.name.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
      {online && <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-[#22c55e]" />}
    </span>
  );
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const t = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return sameDay ? t : `${d.toLocaleDateString([], { day: "numeric", month: "short" })} ${t}`;
}

function useAutoScroll(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [dep]);
  const onScroll = () => {
    const el = ref.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };
  return { ref, onScroll };
}

function MessageList({
  messages,
  me,
  onUser,
  onDelete,
  onBan,
  empty,
}: {
  messages: ChatMessage[];
  me: Me | null;
  onUser?: (u: ChatUser) => void;
  onDelete?: (m: ChatMessage) => void;
  onBan?: (u: ChatUser) => void;
  empty: string;
}) {
  const { ref, onScroll } = useAutoScroll(messages.length ? messages[messages.length - 1].id : 0);
  return (
    <div ref={ref} onScroll={onScroll} className="flex-1 space-y-2.5 overflow-y-auto bg-[#f4f4f5] px-3 py-3" data-testid="chat-messages">
      {messages.length === 0 && <p className="py-10 text-center text-xs text-[#55555c]">{empty}</p>}
      {messages.map((m, i) => {
        const mine = m.senderId === me?.id;
        const grouped = i > 0 && messages[i - 1].senderId === m.senderId &&
          new Date(m.createdAt).getTime() - new Date(messages[i - 1].createdAt).getTime() < 120_000;
        return (
          <div key={m.id} className={cn("group flex gap-2", mine && "flex-row-reverse", grouped && "-mt-1.5")}>
            {grouped ? (
              <span className="w-8 shrink-0" />
            ) : (
              <button
                type="button"
                onClick={() => !mine && onUser?.(m.sender)}
                className="mt-0.5 size-8 shrink-0 rounded-full"
                title={mine ? "You" : `Message ${m.sender.name} privately`}
              >
                <ChatAvatar user={m.sender} className="size-8" />
              </button>
            )}
            <div className={cn("min-w-0 max-w-[78%]", mine && "items-end text-right")}>
              {!grouped && (
                <p className={cn("mb-0.5 flex items-baseline gap-1.5 text-[11px] text-[#55555c]", mine && "justify-end")}>
                  {!mine && (
                    <button type="button" onClick={() => onUser?.(m.sender)} className="font-bold text-[#0b0b0c] hover:underline">
                      {m.sender.name}
                    </button>
                  )}
                  {mine && <span className="font-bold text-[#0b0b0c]">You</span>}
                  <time dateTime={m.createdAt}>{timeLabel(m.createdAt)}</time>
                </p>
              )}
              <div
                className={cn(
                  "inline-block max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-2xl px-3 py-2 text-left text-sm shadow-sm",
                  mine ? "rounded-tr-md bg-[#e3121b] text-white" : "rounded-tl-md bg-white text-[#0b0b0c]",
                )}
              >
                {m.body}
              </div>
              {me?.isAdmin && (onDelete || onBan) && (
                <span className={cn("ml-1 hidden gap-1 align-middle group-hover:inline-flex", mine && "mr-1")}>
                  {onDelete && (
                    <button type="button" onClick={() => onDelete(m)} className="rounded p-1 text-[#55555c] hover:bg-black/5 hover:text-[#e3121b]" title="Delete message (admin)" aria-label="Delete message">
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                  {onBan && !mine && (
                    <button type="button" onClick={() => onBan(m.sender)} className="rounded p-1 text-[#55555c] hover:bg-black/5 hover:text-[#e3121b]" title="Ban from chat (admin)" aria-label="Ban user">
                      <Ban className="size-3.5" />
                    </button>
                  )}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Composer({
  signedIn,
  banned,
  placeholder,
  onSend,
  autoFocus,
}: {
  signedIn: boolean;
  banned?: boolean;
  placeholder: string;
  onSend: (text: string) => Promise<{ ok: boolean; error?: string }>;
  autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (autoFocus && signedIn) setTimeout(() => inputRef.current?.focus(), 60);
  }, [autoFocus, signedIn]);

  if (!signedIn) {
    return (
      <div className="flex items-center gap-2 border-t border-black/10 bg-white p-2.5">
        <p className="flex-1 text-xs text-[#55555c]">Guests can read along. Sign in with Google to post and DM.</p>
        <a href={signInHref()} className="inline-flex items-center gap-1.5 rounded-full bg-[#e3121b] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#ff2a33]">
          <LogIn className="size-3.5" /> Sign in
        </a>
      </div>
    );
  }
  if (banned) {
    return <p className="border-t border-black/10 bg-white p-3 text-center text-xs text-[#a80b12]">A site admin has blocked you from chat.</p>;
  }
  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    const res = await onSend(text);
    setBusy(false);
    if (res.ok) setDraft("");
    else toast.error(res.error || "Couldn't send");
  }
  return (
    <form onSubmit={submit} className="flex items-end gap-2 border-t border-black/10 bg-white p-2.5">
      <div className="relative flex-1">
        <textarea
          ref={inputRef}
          value={draft}
          maxLength={MAX_LEN}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={1}
          placeholder={placeholder}
          className="max-h-28 min-h-10 w-full resize-none rounded-2xl border border-black/15 bg-[#f4f4f5] px-3.5 py-2.5 text-sm text-[#0b0b0c] outline-none focus:border-[#1f9fd6]"
        />
        {draft.length > MAX_LEN - 80 && (
          <span className="absolute bottom-1 right-3 text-[10px] text-[#55555c]">{MAX_LEN - draft.length}</span>
        )}
      </div>
      <button
        type="submit"
        disabled={busy || !draft.trim()}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e3121b] text-white transition hover:bg-[#ff2a33] disabled:opacity-40"
        aria-label="Send message"
      >
        <Send className="size-4" />
      </button>
    </form>
  );
}

export function RoomPane(props: {
  me: Me | null;
  signedIn: boolean;
  messages: ChatMessage[];
  onlineCount: number;
  onUser: (u: ChatUser) => void;
  onSend: (text: string) => Promise<{ ok: boolean; error?: string }>;
  onAdmin: (body: Record<string, unknown>) => Promise<unknown>;
  active: boolean;
}) {
  const { me } = props;
  return (
    <>
      <div className="flex items-center justify-between border-b border-black/10 bg-white px-3 py-1.5 text-[11px] text-[#55555c]">
        <span><b className="text-[#0b0b0c]">Siftah Room</b> · public · last 100 messages</span>
        <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-[#22c55e]" />{props.onlineCount} online</span>
      </div>
      <MessageList
        messages={props.messages}
        me={me}
        onUser={props.onUser}
        empty="No messages yet. Say kia ora to the room!"
        onDelete={me?.isAdmin ? (m) => void props.onAdmin({ action: "admin_delete", id: m.id }) : undefined}
        onBan={me?.isAdmin ? (u) => {
          if (window.confirm(`Ban ${u.name} from chat? Their room messages will be hidden.`)) void props.onAdmin({ action: "admin_ban", userId: u.id });
        } : undefined}
      />
      <Composer signedIn={props.signedIn} banned={me?.banned} placeholder="Message the room…" onSend={props.onSend} autoFocus={props.active} />
    </>
  );
}

export function PeoplePane(props: {
  me: Me | null;
  signedIn: boolean;
  online: ChatUser[];
  inbox: InboxItem[];
  onOpen: (u: ChatUser) => void;
}) {
  const onlineIds = new Set(props.online.map((u) => u.id));
  const others = props.online.filter((u) => u.id !== props.me?.id);
  return (
    <div className="flex-1 overflow-y-auto bg-[#f4f4f5]">
      {!props.signedIn && (
        <div className="m-3 rounded-2xl border border-[#e3121b]/25 bg-white p-3 text-xs text-[#55555c]">
          Sign in with Google to appear online and message people privately.{" "}
          <a href={signInHref()} className="font-bold text-[#e3121b] underline">Sign in</a>
        </div>
      )}
      {props.inbox.length > 0 && (
        <section className="px-3 pt-3">
          <h3 className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-[#55555c]">Messages</h3>
          <ul className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {props.inbox.map((item) => (
              <li key={item.peer.id}>
                <button type="button" onClick={() => props.onOpen(item.peer)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-black/[0.03]">
                  <ChatAvatar user={item.peer} online={onlineIds.has(item.peer.id)} className="size-9" />
                  <span className={cn("min-w-0 flex-1 truncate text-sm", item.unread ? "font-black" : "font-semibold")}>{item.peer.name}</span>
                  {item.unread > 0 && (
                    <span className="min-w-5 rounded-full bg-[#e3121b] px-1.5 py-0.5 text-center text-[10px] font-black text-white">{item.unread > 99 ? "99+" : item.unread}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="p-3">
        <h3 className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-[#55555c]">Online now · {others.length + (props.me ? 1 : 0)}</h3>
        <ul className="overflow-hidden rounded-2xl bg-white shadow-sm" data-testid="online-list">
          {props.me && (
            <li className="flex items-center gap-3 px-3 py-2.5 opacity-70">
              <ChatAvatar user={props.me} online className="size-9" />
              <span className="flex-1 truncate text-sm font-semibold">{props.me.name} <span className="text-xs font-normal text-[#55555c]">(you)</span></span>
            </li>
          )}
          {others.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => props.onOpen(u)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-black/[0.03]"
                title={`Message ${u.name} privately`}
              >
                <ChatAvatar user={u} online className="size-9" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{u.name}</span>
                <MessageCircle className="size-4 text-[#1f9fd6]" />
              </button>
            </li>
          ))}
          {others.length === 0 && !props.me && <li className="px-3 py-6 text-center text-xs text-[#55555c]">Nobody signed in is online right now.</li>}
          {others.length === 0 && props.me && <li className="px-3 py-4 text-center text-xs text-[#55555c]">You're the only one here right now.</li>}
        </ul>
      </section>
    </div>
  );
}

export function DmPane(props: {
  me: Me | null;
  signedIn: boolean;
  peer: ChatUser;
  peerOnline: boolean;
  messages: ChatMessage[];
  onBack: () => void;
  onSend: (text: string) => Promise<{ ok: boolean; error?: string }>;
  active: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-black/10 bg-white px-2 py-1.5">
        <button type="button" onClick={props.onBack} className="inline-flex size-8 items-center justify-center rounded-full hover:bg-black/5" aria-label="Back to people">
          <ArrowLeft className="size-4" />
        </button>
        <ChatAvatar user={props.peer} online={props.peerOnline} className="size-8" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{props.peer.name}</p>
          <p className="text-[10px] text-[#55555c]">{props.peerOnline ? "Online · private chat" : "Offline · they'll see it next visit"}</p>
        </div>
      </div>
      <MessageList messages={props.messages} me={props.me} empty={`Start a private conversation with ${props.peer.name}. Only the two of you can see it.`} />
      <Composer signedIn={props.signedIn} banned={props.me?.banned} placeholder={`Message ${props.peer.name.split(" ")[0]}…`} onSend={props.onSend} autoFocus={props.active} />
    </>
  );
}
