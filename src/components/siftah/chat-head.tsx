import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, Maximize2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { getBearerToken } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";
import { SIFTAH_MARK_SRC } from "./brand";
import { UserAvatar } from "./user-avatar";

type Msg = { role: "user" | "assistant"; content: string };
const STORE_KEY = "siftah-chathead-history";
const API = "/api/siftah/chat";

async function callSiftah(body: Record<string, unknown>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const bearer = getBearerToken();
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  const res = await fetch(API, { method: "POST", credentials: "same-origin", headers, body: JSON.stringify(body) });
  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    /* non-JSON */
  }
  return { ok: res.ok, status: res.status, data };
}

/**
 * Floating chat head (bottom corner) that pops open into a chat bubble.
 * Signed in → the user's Google profile photo; signed out → the Siftah mark.
 * Wired to the site's existing Siftah AI backend (POST /api/siftah/chat,
 * persona "siftah"); guests get the backend's signed guest-trial cookie.
 */
export function SiftahChatHead() {
  const { user, isPending } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORE_KEY);
      if (saved) setMsgs(JSON.parse(saved) as Msg[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(msgs.slice(-30)));
    } catch {
      /* ignore */
    }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  const firstName = user?.displayName?.split(" ")[0];

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setDraft("");
    setBusy(true);
    setNotice(null);
    try {
      if (!user) await callSiftah({ action: "guest" });
      const { ok, data } = await callSiftah({ action: "chat", persona: "siftah", messages: next.slice(-16) });
      const reply = typeof data.reply === "string" ? data.reply : typeof data.content === "string" ? data.content : "";
      if (ok && reply) {
        setMsgs((m) => [...m, { role: "assistant", content: reply }]);
      } else {
        const err = typeof data.error === "string" ? data.error : "Siftah is unavailable right now. Please try again.";
        setNotice(err);
      }
    } catch {
      setNotice("Couldn't reach Siftah. Check your connection and try again.");
      toast.error("Siftah chat is offline");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 z-50 flex flex-col items-end gap-3 sm:right-5 lg:bottom-5">
      {open && (
        <section
          className="siftah-pop pointer-events-auto flex h-[min(34rem,calc(100dvh-10rem))] w-[min(23rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[1.6rem] rounded-br-md border-2 border-[#0b0b0c] bg-white text-[#0b0b0c] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.55)]"
          aria-label="Siftah chat"
        >
          <header className="flex items-center gap-3 bg-[#0b0b0c] px-4 py-3 text-white">
            <img src={SIFTAH_MARK_SRC} alt="" className="size-9 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-base leading-tight">Siftah</p>
              <p className="flex items-center gap-1.5 text-[11px] text-white/65">
                <span className="size-1.5 rounded-full bg-[#5cc8f2]" />
                {user ? `Signed in as ${firstName ?? "member"}` : "Guest trial · sign in for more"}
              </p>
            </div>
            <a
              href="/siftah/"
              className="inline-flex size-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
              title="Open full Siftah AI"
              aria-label="Open full Siftah AI"
            >
              <Maximize2 className="size-4" />
            </a>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex size-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Close chat"
            >
              <X className="size-4" />
            </button>
          </header>
          <div className="siftah-stripe h-1" />

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-[#f4f4f5] px-3 py-4">
            {msgs.length === 0 && (
              <div className="flex gap-2">
                <img src={SIFTAH_MARK_SRC} alt="" className="mt-0.5 size-7 shrink-0 rounded-lg" />
                <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-sm shadow-sm">
                  Kia ora{firstName ? ` ${firstName}` : ""}! I'm <b>Siftah</b>. Ask me about plates, gear on the
                  marketplace, or anything else.
                </div>
              </div>
            )}
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end gap-2">
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-[#e3121b] px-3.5 py-2.5 text-sm text-white shadow-sm">
                    {m.content}
                  </div>
                  <UserAvatar user={user} className="mt-0.5 size-7 shrink-0" />
                </div>
              ) : (
                <div key={i} className="flex gap-2">
                  <img src={SIFTAH_MARK_SRC} alt="" className="mt-0.5 size-7 shrink-0 rounded-lg" />
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-sm shadow-sm">
                    {m.content}
                  </div>
                </div>
              ),
            )}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-[#55555c]">
                <Loader2 className="size-4 animate-spin text-[#e3121b]" /> Siftah is typing…
              </div>
            )}
            {notice && (
              <div className="rounded-xl border border-[#e3121b]/30 bg-[#e3121b]/5 px-3 py-2 text-xs text-[#a80b12]">
                {notice}{" "}
                {!user && (
                  <a href="/login?callbackURL=%2F" className="font-bold underline">
                    Sign in
                  </a>
                )}
              </div>
            )}
          </div>

          <form onSubmit={send} className="flex items-end gap-2 border-t border-black/10 bg-white p-2.5">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder="Message Siftah…"
              className="max-h-28 min-h-10 flex-1 resize-none rounded-2xl border border-black/15 bg-[#f4f4f5] px-3.5 py-2.5 text-sm text-[#0b0b0c] outline-none focus:border-[#1f9fd6]"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e3121b] text-white transition hover:bg-[#ff2a33] disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="size-4" />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "pointer-events-auto relative size-16 rounded-full border-[3px] border-white bg-[#0b0b0c] p-0 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)] outline-none ring-2 ring-[#e3121b] transition hover:scale-105 focus-visible:ring-4 focus-visible:ring-[#5cc8f2]",
          open && "scale-95",
        )}
        aria-label={open ? "Close Siftah chat" : "Open Siftah chat"}
        aria-expanded={open}
      >
        {isPending ? (
          <span className="block size-full animate-pulse rounded-full bg-white/10" />
        ) : user?.profileImageUrl ? (
          <img src={user.profileImageUrl} alt="" referrerPolicy="no-referrer" className="size-full rounded-full object-cover" />
        ) : user ? (
          <UserAvatar user={user} className="size-full text-2xl" />
        ) : (
          <img src={SIFTAH_MARK_SRC} alt="" className="size-full rounded-full object-cover" />
        )}
        <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full border-2 border-white bg-[#5cc8f2] text-[10px] font-black text-[#0b0b0c]">
          {open ? "×" : "•"}
        </span>
      </button>
    </div>
  );
}
