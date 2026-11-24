import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBearerToken } from "@/lib/auth/client";
import { connectRealtime } from "./realtime";

export type ChatUser = { id: string; name: string; image: string | null };
export type ChatMessage = {
  id: number;
  senderId: string;
  recipientId: string | null;
  body: string;
  createdAt: string;
  sender: ChatUser;
};
export type Me = { id: string; name: string; image: string | null; isAdmin: boolean; banned: boolean };
export type InboxItem = { peer: ChatUser; unread: number; lastId: number };

const API = "/api/site-chat";

export async function siteChatCall(body: Record<string, unknown>) {
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

function mergeById(prev: ChatMessage[], incoming: ChatMessage[], cap = 150) {
  if (!incoming.length) return prev;
  const map = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort((a, b) => a.id - b.id).slice(-cap);
}

/**
 * Site chat state: public room, online list, DM inbox + the open DM thread.
 * Data always comes from /api/site-chat. Supabase Realtime Broadcast (when configured) only nudges
 * an immediate re-fetch; polling is the fallback (fast while the panel is open, slow when closed,
 * paused while the tab is hidden so presence lapses naturally).
 */
export function useSiteChat({ open, roomVisible, dmPeer }: { open: boolean; roomVisible: boolean; dmPeer: string | null }) {
  const [signedIn, setSignedIn] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [room, setRoom] = useState<ChatMessage[]>([]);
  const [online, setOnline] = useState<ChatUser[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [dms, setDms] = useState<Record<string, ChatMessage[]>>({});
  const [realtime, setRealtime] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [roomSeenId, setRoomSeenId] = useState<number>(() => {
    if (typeof localStorage === "undefined") return 0;
    return Number(localStorage.getItem("site-chat-room-seen") || 0) || 0;
  });

  const state = useRef({ roomLast: 0, dmLast: {} as Record<string, number>, lastFull: 0, inflight: false, again: false });
  const peerRef = useRef(dmPeer);
  peerRef.current = dmPeer;
  const rtCfg = useRef<{ url: string; key: string; roomTopic: string; dmTopic: string | null } | null>(null);
  const [rtKey, setRtKey] = useState("");

  const sync = useCallback(async (opts: { fullRoom?: boolean } = {}) => {
    const s = state.current;
    if (s.inflight) {
      s.again = true;
      return;
    }
    s.inflight = true;
    try {
      const full = Date.now() - s.lastFull > 60_000;
      const peer = peerRef.current;
      const fullRoom = opts.fullRoom || full;
      const { ok, data } = await siteChatCall({
        action: "sync",
        full,
        roomAfter: fullRoom ? 0 : s.roomLast,
        dmPeer: peer ?? undefined,
        dmAfter: peer ? s.dmLast[peer] ?? 0 : undefined,
      });
      if (!ok) return;
      if (full) s.lastFull = Date.now();
      setSignedIn(Boolean(data.signedIn));
      if (data.me !== undefined && full) setMe((data.me as Me | null) ?? null);
      if (!data.signedIn) setMe(null);
      const r = (data.room as ChatMessage[]) || [];
      setRoom((prev) => (fullRoom ? r : mergeById(prev, r)));
      if (r.length) s.roomLast = Math.max(s.roomLast, r[r.length - 1].id);
      else if (fullRoom) s.roomLast = 0;
      setOnline((data.online as ChatUser[]) || []);
      setInbox((data.inbox as InboxItem[]) || []);
      if (peer && Array.isArray(data.dm)) {
        const d = data.dm as ChatMessage[];
        setDms((prev) => ({ ...prev, [peer]: mergeById(prev[peer] || [], d) }));
        if (d.length) s.dmLast[peer] = Math.max(s.dmLast[peer] ?? 0, d[d.length - 1].id);
      }
      const rt = data.realtime as typeof rtCfg.current | undefined;
      if (rt && rt.url && rt.key) {
        const key = `${rt.url}|${rt.roomTopic}|${rt.dmTopic ?? ""}`;
        rtCfg.current = rt;
        setRtKey(key);
      }
      setLoaded(true);
    } catch {
      /* offline; next tick retries */
    } finally {
      s.inflight = false;
      if (s.again) {
        s.again = false;
        void sync();
      }
    }
  }, []);

  // Realtime nudges.
  useEffect(() => {
    const cfg = rtCfg.current;
    if (!cfg || !rtKey) return;
    const topics = [cfg.roomTopic, ...(cfg.dmTopic ? [cfg.dmTopic] : [])];
    const handle = connectRealtime({
      url: cfg.url,
      apiKey: cfg.key,
      topics,
      onStatus: setRealtime,
      onEvent: (_topic, event, payload) => {
        if (event === "room" && typeof payload.deleted === "number") {
          setRoom((prev) => prev.filter((m) => m.id !== payload.deleted));
        }
        void sync();
      },
    });
    return () => handle.close();
  }, [rtKey, sync]);

  // Polling + presence heartbeat.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      if (document.visibilityState === "visible") void sync();
      const delay = open ? (realtime ? 15_000 : 3_000) : realtime ? 25_000 : 20_000;
      timer = setTimeout(tick, delay);
    };
    tick();
    const onVis = () => {
      if (document.visibilityState === "visible") void sync();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [open, realtime, sync]);

  // Fetch the thread immediately when a DM opens.
  useEffect(() => {
    if (dmPeer) void sync();
  }, [dmPeer, sync]);

  // Leave presence when the page goes away.
  useEffect(() => {
    if (!signedIn) return;
    const leave = () => {
      try {
        navigator.sendBeacon?.(API, new Blob([JSON.stringify({ action: "leave" })], { type: "application/json" }));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("pagehide", leave);
    return () => window.removeEventListener("pagehide", leave);
  }, [signedIn]);

  // Mark the open DM thread read.
  const dmThread = dmPeer ? dms[dmPeer] || [] : [];
  const lastDmId = dmThread.length ? dmThread[dmThread.length - 1].id : 0;
  const inboxUnreadForPeer = dmPeer ? inbox.find((i) => i.peer.id === dmPeer)?.unread ?? 0 : 0;
  useEffect(() => {
    if (!open || !dmPeer || !lastDmId || !inboxUnreadForPeer) return;
    void siteChatCall({ action: "read", peer: dmPeer, lastId: lastDmId }).then(() => {
      setInbox((prev) => prev.map((i) => (i.peer.id === dmPeer ? { ...i, unread: 0 } : i)));
    });
  }, [open, dmPeer, lastDmId, inboxUnreadForPeer]);

  // Room "seen" marker.
  const lastRoomId = room.length ? room[room.length - 1].id : 0;
  useEffect(() => {
    if (open && roomVisible && lastRoomId && lastRoomId !== roomSeenId) {
      setRoomSeenId(lastRoomId);
      try {
        localStorage.setItem("site-chat-room-seen", String(lastRoomId));
      } catch {
        /* ignore */
      }
    }
  }, [open, roomVisible, lastRoomId, roomSeenId]);

  const dmUnread = useMemo(
    () => inbox.reduce((n, i) => n + (open && i.peer.id === dmPeer ? 0 : i.unread), 0),
    [inbox, open, dmPeer],
  );
  const roomUnread = useMemo(
    () => (roomSeenId ? room.filter((m) => m.id > roomSeenId && m.senderId !== me?.id).length : 0),
    [room, roomSeenId, me?.id],
  );

  const send = useCallback(
    async (text: string, to: string | null) => {
      const { ok, data } = await siteChatCall({ action: "send", body: text, to });
      if (ok && data.message) {
        const m = data.message as ChatMessage;
        if (to) {
          setDms((prev) => ({ ...prev, [to]: mergeById(prev[to] || [], [m]) }));
          state.current.dmLast[to] = Math.max(state.current.dmLast[to] ?? 0, m.id);
        } else {
          setRoom((prev) => mergeById(prev, [m]));
          state.current.roomLast = Math.max(state.current.roomLast, m.id);
        }
        void sync();
        return { ok: true as const };
      }
      return { ok: false as const, error: typeof data.error === "string" ? data.error : "Couldn't send. Try again." };
    },
    [sync],
  );

  const admin = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await siteChatCall(body);
      await sync({ fullRoom: true });
      return res;
    },
    [sync],
  );

  return { loaded, signedIn, me, room, online, inbox, dmThread, realtime, dmUnread, roomUnread, send, admin, refresh: sync };
}
