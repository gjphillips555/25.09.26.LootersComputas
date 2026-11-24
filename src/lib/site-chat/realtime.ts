/**
 * Minimal Supabase Realtime (Phoenix) client for Broadcast "nudges" only.
 * The server broadcasts content-free events ("room", "dm"); the browser just re-fetches from
 * /api/site-chat, which enforces auth and DM privacy. Avoids pulling in supabase-js.
 */
export type RealtimeHandle = { close: () => void };

export function connectRealtime(opts: {
  url: string;
  apiKey: string;
  topics: string[];
  onEvent: (topic: string, event: string, payload: Record<string, unknown>) => void;
  onStatus: (connected: boolean) => void;
}): RealtimeHandle {
  let ws: WebSocket | null = null;
  let closed = false;
  let ref = 0;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let attempts = 0;
  const joined = new Set<string>();
  const wsUrl =
    opts.url.replace(/^http/i, "ws").replace(/\/+$/, "") +
    `/realtime/v1/websocket?apikey=${encodeURIComponent(opts.apiKey)}&vsn=1.0.0`;

  const send = (msg: Record<string, unknown>) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ ...msg, ref: String(++ref) }));
  };

  const open = () => {
    if (closed) return;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      schedule();
      return;
    }
    ws.onopen = () => {
      attempts = 0;
      for (const t of opts.topics) {
        send({
          topic: `realtime:${t}`,
          event: "phx_join",
          join_ref: String(ref + 1),
          payload: { config: { broadcast: { self: false, ack: false }, presence: { key: "" }, private: false } },
        });
      }
      heartbeat = setInterval(() => send({ topic: "phoenix", event: "heartbeat", payload: {} }), 25_000);
    };
    ws.onmessage = (ev) => {
      let msg: { topic?: string; event?: string; payload?: Record<string, unknown> };
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      const topic = (msg.topic || "").replace(/^realtime:/, "");
      if (msg.event === "phx_reply" && topic && topic !== "phoenix") {
        const ok = (msg.payload as { status?: string } | undefined)?.status === "ok";
        if (ok) joined.add(topic);
        opts.onStatus(joined.size === opts.topics.length);
      } else if (msg.event === "broadcast") {
        const p = (msg.payload || {}) as { event?: string; payload?: Record<string, unknown> };
        opts.onEvent(topic, p.event || "", p.payload || {});
      } else if (msg.event === "phx_error" || msg.event === "phx_close") {
        joined.delete(topic);
        opts.onStatus(false);
      }
    };
    ws.onclose = () => {
      joined.clear();
      opts.onStatus(false);
      if (heartbeat) clearInterval(heartbeat);
      schedule();
    };
    ws.onerror = () => ws?.close();
  };

  const schedule = () => {
    if (closed) return;
    attempts += 1;
    retry = setTimeout(open, Math.min(30_000, 1000 * 2 ** Math.min(attempts, 5)));
  };

  open();
  return {
    close() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      if (retry) clearTimeout(retry);
      ws?.close();
    },
  };
}
