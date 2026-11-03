/** Privacy-safe Siftah Message alerts — no message body in notifications. */

import { DEFAULT_VAPID_PUBLIC_KEY } from "@/lib/siftah-message/push-server";

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    audioCtx ??=
      new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return audioCtx;
  } catch {
    return null;
  }
}

/** Short compressed-air / fizzy "pffft" — synthesised offline, no external file. */
export function playPffftSound(): void {
  const ctx = getCtx();
  if (!ctx) return;
  void ctx.resume().catch(() => undefined);

  const duration = 0.18;
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 28) * (1 - t / duration);
    const noise = (Math.random() * 2 - 1) * env;
    data[i] = noise * 0.55;
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 1200;
  const gain = ctx.createGain();
  gain.gain.value = 0.35;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

export type NotifyPermission = NotificationPermission | "unsupported";

export function notificationSupport(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function currentNotifyPermission(): NotifyPermission {
  if (!notificationSupport()) return "unsupported";
  return Notification.permission;
}

export async function ensureNotifyPermission(): Promise<NotifyPermission> {
  if (!notificationSupport()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Never includes message text — only a count. */
export function showPrivateMessageNotification(newCount: number): void {
  if (!notificationSupport() || Notification.permission !== "granted") return;
  if (newCount < 1) return;

  const body =
    newCount === 1 ? "New message received" : `${newCount} new messages received`;

  try {
    const n = new Notification("Siftah Message", {
      body,
      tag: "siftah-message-private",
      renotify: true,
      silent: true,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    window.setTimeout(() => n.close(), 6000);
  } catch {
    /* ignore */
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupport(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    notificationSupport()
  );
}

export async function registerSiftahServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupport()) return null;
  try {
    return await navigator.serviceWorker.register("/sw-siftah-message.js", {
      scope: "/",
    });
  } catch {
    return null;
  }
}

/** Subscribe to VAPID push and POST subscription to API. */
export async function enablePushNotifications(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupport()) return { ok: false, error: "Push not supported on this device/browser." };

  const perm = await ensureNotifyPermission();
  if (perm !== "granted") return { ok: false, error: "Notification permission not granted." };

  const reg = await registerSiftahServiceWorker();
  if (!reg) return { ok: false, error: "Could not register service worker." };

  await navigator.serviceWorker.ready;

  const publicKey =
    (import.meta as { env?: { VITE_VAPID_PUBLIC_KEY?: string } }).env?.VITE_VAPID_PUBLIC_KEY ||
    DEFAULT_VAPID_PUBLIC_KEY;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const json = sub.toJSON();
  const r = await fetch("/api/siftah-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "push_subscribe",
      endpoint: json.endpoint,
      keys: json.keys,
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: (data as { error?: string }).error || "Subscribe failed" };
  return { ok: true };
}

export async function disablePushNotifications(): Promise<void> {
  if (!pushSupport()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await fetch("/api/siftah-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "push_unsubscribe", endpoint }),
      });
    }
  } catch {
    /* ok */
  }
}
