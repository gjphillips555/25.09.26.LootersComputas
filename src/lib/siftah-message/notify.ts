/** Privacy-safe Siftah Message alerts — no message body in notifications. */

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
