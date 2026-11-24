import { useEffect, useState } from "react";
import { ArrowLeft, Bot, Maximize2, MessagesSquare, UserRound, Users, X } from "lucide-react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useSiteChat, type ChatUser } from "@/lib/site-chat/use-site-chat";
import { cn } from "@/lib/utils";
import { SIFTAH_MARK_SRC } from "./brand";
import { UserAvatar } from "./user-avatar";
import { SiftahAiPane } from "./ai-pane";
import { DmPane, PeoplePane, RoomPane } from "./site-chat-panes";
import { ProfileEditor } from "./profile-editor";

/** Any link to these paths opens the pop-up chat in place instead of navigating. */
export const CHAT_LINK_PATH = /^\/(siftah-message|siftah-messenger|messages|messenger|inbox|chat)\/?$/i;

type Tab = "room" | "people" | "ai";
const TAB_KEY = "siftah-chat-tab";

/**
 * Floating chat head (bottom corner) that pops open into the site chat panel:
 *  - Room: public chat everyone on the site can read (signed-in members post).
 *  - Online: who's online now + DM conversations; click someone for a private 1:1 thread.
 *  - Mr CluedUp: the site AI assistant (existing /api/siftah/chat backend).
 * Desktop: a side pop-up. Mobile: a full-height sheet. The head shows the user's Google photo
 * and a red badge for unread DMs (blue dot for new room messages).
 */
export function SiftahChatHead() {
  const { user, isPending } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("room");
  const [peer, setPeer] = useState<ChatUser | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(TAB_KEY) as Tab | null;
      if (saved === "room" || saved === "people" || saved === "ai") setTab(saved);
    } catch {
      /* ignore */
    }
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: Tab; peer?: ChatUser; profile?: boolean }>).detail;
      setProfileOpen(Boolean(detail?.profile));
      if (detail?.peer) {
        setPeer(detail.peer);
        setTab("people");
      } else if (detail?.tab) setTab(detail.tab);
      setOpen(true);
    };
    window.addEventListener("siftah:open-chat", onOpen);

    // Old message routes redirect here with ?chat=messages|room|ai|profile: open the pop-up, then tidy the URL.
    try {
      const url = new URL(window.location.href);
      const want = url.searchParams.get("chat");
      if (want) {
        url.searchParams.delete("chat");
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
        const map: Record<string, Tab> = { messages: "people", people: "people", dm: "people", room: "room", ai: "ai" };
        if (want === "profile") setProfileOpen(true);
        setTab(map[want] ?? "people");
        setOpen(true);
      }
    } catch {
      /* ignore */
    }

    // Every Siftah Message / Messenger / Inbox link opens the pop-up in place (capture phase, before router links).
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href], [data-open-chat]") as HTMLElement | null;
      if (!a) return;
      let tabWanted: Tab = "people";
      if (a.hasAttribute("data-open-chat")) {
        const v = a.getAttribute("data-open-chat");
        if (v === "room" || v === "ai") tabWanted = v;
      } else {
        const href = a.getAttribute("href") || "";
        let u: URL;
        try {
          u = new URL(href, window.location.href);
        } catch {
          return;
        }
        if (u.origin !== window.location.origin || !CHAT_LINK_PATH.test(u.pathname)) return;
      }
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new Event("siftah:close-menu"));
      setProfileOpen(false);
      setPeer(null);
      setTab(tabWanted);
      setOpen(true);
    };
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("siftah:open-chat", onOpen);
      document.removeEventListener("click", onClick, true);
    };
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(TAB_KEY, tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  // Lock page scroll behind the full-height mobile sheet.
  useEffect(() => {
    if (!open || typeof window === "undefined" || window.innerWidth >= 640) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const chat = useSiteChat({ open, roomVisible: tab === "room", dmPeer: tab === "people" && peer ? peer.id : null });
  const onlineIds = new Set(chat.online.map((u) => u.id));

  const openDm = (u: ChatUser) => {
    if (!chat.signedIn) {
      setTab("people");
      return;
    }
    if (u.id === chat.me?.id) return;
    setPeer(u);
    setTab("people");
  };

  const headUnread = chat.dmUnread;
  const subtitle = tab === "ai"
    ? user ? "Mr CluedUp · AI assistant" : "Mr CluedUp · guest trial"
    : chat.signedIn
      ? `${chat.online.length} online${chat.realtime ? " · live" : ""}`
      : `${chat.online.length} online · guests can read`;

  const tabs: Array<{ id: Tab; label: string; icon: typeof Bot; badge?: number; dot?: boolean }> = [
    { id: "room", label: "Room", icon: MessagesSquare, dot: tab !== "room" && chat.roomUnread > 0 },
    { id: "people", label: `Online${chat.online.length ? ` ${chat.online.length}` : ""}`, icon: Users, badge: chat.dmUnread },
    { id: "ai", label: "Mr CluedUp", icon: Bot },
  ];

  return (
    <div className="pointer-events-none fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 z-50 flex flex-col items-end gap-3 sm:right-5 lg:bottom-5">
      {open && (
        <section
          className={cn(
            "siftah-pop pointer-events-auto flex flex-col overflow-hidden bg-white text-[#0b0b0c]",
            // Mobile: full-height sheet.
            "fixed inset-0 z-[60] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
            // Desktop: side pop-up.
            "sm:static sm:z-auto sm:h-[min(38rem,calc(100dvh-8rem))] sm:w-[25rem] sm:rounded-[1.6rem] sm:rounded-br-md sm:border-2 sm:border-[#0b0b0c] sm:p-0 sm:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.55)]",
          )}
          aria-label="Siftah chat"
          role="dialog"
        >
          <header className="flex items-center gap-3 bg-[#0b0b0c] px-4 py-3 text-white">
            <img src={SIFTAH_MARK_SRC} alt="" className="size-9 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-base leading-tight">Siftah Chat</p>
              <p className="flex items-center gap-1.5 text-[11px] text-white/65">
                <span className={cn("size-1.5 rounded-full", chat.realtime || tab === "ai" ? "bg-[#5cc8f2]" : "bg-[#22c55e]")} />
                {subtitle}
              </p>
            </div>
            {chat.signedIn && (
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className={cn("inline-flex size-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white", profileOpen && "bg-white/15 text-white")}
                title="Edit my username and avatar"
                aria-label="Edit my username and avatar"
                data-testid="chat-profile-button"
              >
                <UserRound className="size-4" />
              </button>
            )}
            {tab === "ai" && (
              <a
                href="/siftah/"
                className="inline-flex size-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                title="Open Mr CluedUp full screen"
                aria-label="Open Mr CluedUp full screen"
              >
                <Maximize2 className="size-4" />
              </a>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex size-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Close chat"
            >
              <X className="size-4" />
            </button>
          </header>
          <nav className="grid grid-cols-3 gap-1 bg-[#0b0b0c] px-2 pb-2" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => {
                  setProfileOpen(false);
                  setTab(t.id);
                  if (t.id === "people" && tab === "people") setPeer(null);
                }}
                className={cn(
                  "relative inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-bold transition",
                  tab === t.id ? "bg-white text-[#0b0b0c]" : "text-white/75 hover:bg-white/10 hover:text-white",
                )}
              >
                <t.icon className="size-3.5" />
                {t.label}
                {t.badge ? (
                  <span className="absolute -right-0.5 -top-1 min-w-4 rounded-full bg-[#e3121b] px-1 text-[9px] font-black leading-4 text-white">{t.badge > 99 ? "99+" : t.badge}</span>
                ) : t.dot ? (
                  <span className="absolute right-1.5 top-1 size-2 rounded-full bg-[#5cc8f2]" />
                ) : null}
              </button>
            ))}
          </nav>
          <div className="siftah-stripe h-1" />

          {profileOpen && (
            <div className="flex-1 overflow-y-auto p-4" data-testid="chat-profile-pane">
              <button type="button" onClick={() => setProfileOpen(false)} className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-[#1f9fd6]"><ArrowLeft className="size-3.5" /> Back to chat</button>
              <p className="mb-3 font-display text-lg">My profile</p>
              <ProfileEditor compact />
            </div>
          )}
          {!profileOpen && tab === "room" && (
            <RoomPane
              me={chat.me}
              signedIn={chat.signedIn}
              messages={chat.room}
              onlineCount={chat.online.length}
              onUser={openDm}
              onSend={(text) => chat.send(text, null)}
              onAdmin={chat.admin}
              active={open && tab === "room"}
            />
          )}
          {!profileOpen && tab === "people" && !peer && (
            <PeoplePane me={chat.me} signedIn={chat.signedIn} online={chat.online} inbox={chat.inbox} onOpen={openDm} />
          )}
          {!profileOpen && tab === "people" && peer && (
            <DmPane
              me={chat.me}
              signedIn={chat.signedIn}
              peer={peer}
              peerOnline={onlineIds.has(peer.id)}
              messages={chat.dmThread}
              onBack={() => setPeer(null)}
              onSend={(text) => chat.send(text, peer.id)}
              active={open}
            />
          )}
          {!profileOpen && tab === "ai" && <SiftahAiPane active={open && tab === "ai"} />}
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "pointer-events-auto relative size-16 rounded-full border-[3px] border-white bg-[#0b0b0c] p-0 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)] outline-none ring-2 ring-[#e3121b] transition hover:scale-105 focus-visible:ring-4 focus-visible:ring-[#5cc8f2]",
          open && "scale-95 max-sm:hidden",
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
        {headUnread > 0 && !open ? (
          <span className="absolute -right-1 -top-1 flex min-w-6 items-center justify-center rounded-full border-2 border-white bg-[#e3121b] px-1 text-[11px] font-black leading-5 text-white" data-testid="chat-unread">
            {headUnread > 99 ? "99+" : headUnread}
          </span>
        ) : (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full border-2 border-white text-[10px] font-black text-[#0b0b0c]",
              chat.roomUnread > 0 && !open ? "bg-[#5cc8f2] animate-pulse" : "bg-[#5cc8f2]",
            )}
          >
            {open ? "×" : chat.online.length > 1 ? chat.online.length : "•"}
          </span>
        )}
      </button>
    </div>
  );
}
