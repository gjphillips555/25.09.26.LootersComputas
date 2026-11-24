import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { getBearerToken } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
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
 * Mr CluedUp (AI) tab of the chat panel. Wired to the site's existing Siftah AI backend
 * (POST /api/siftah/chat, persona "siftah"); guests get the backend's signed guest-trial cookie.
 */
export function SiftahAiPane({ active }: { active: boolean }) {
  const { user } = useCurrentUserState();
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
    if (active) setTimeout(() => inputRef.current?.focus(), 60);
  }, [active]);

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
        const err = typeof data.error === "string" ? data.error : "Mr CluedUp is unavailable right now. Please try again.";
        setNotice(err);
      }
    } catch {
      setNotice("Couldn't reach Mr CluedUp. Check your connection and try again.");
      toast.error("Mr CluedUp is offline");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
    <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-[#f4f4f5] px-3 py-4">
      {msgs.length === 0 && (
        <div className="flex gap-2">
          <img src={SIFTAH_MARK_SRC} alt="" className="mt-0.5 size-7 shrink-0 rounded-lg" />
          <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-sm shadow-sm">
            Kia ora{firstName ? ` ${firstName}` : ""}! I'm <b>Mr CluedUp</b>. Ask me about plates, gear on the
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
          <Loader2 className="size-4 animate-spin text-[#e3121b]" /> Mr CluedUp is typing…
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
        placeholder="Message Mr CluedUp…"
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
    </>
  );
}
