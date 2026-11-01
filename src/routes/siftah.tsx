import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { SiteDomainLine } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/siftah")({
  head: () => ({
    meta: [
      { title: "Siftah Mobile | Looters Computas" },
      {
        name: "description",
        content:
          "Siftah Mobile — unrestricted AI chat. Free trial, then $4.99 for more messages and premium servers.",
      },
    ],
  }),
  component: SiftahPage,
});

/** 2 credits per bubble (user + assistant). 100 paid = 50 bubbles = 25 replies. */
const CREDITS_PER_MSG = 2;
const FREE_CREDITS = 20;
const PAID_CREDITS = 100;
const PAID_USD = 4.99;

/**
 * Vercel env: VITE_SIFTAH_PAYPAL_ME = your PayPal.me slug only
 * Create / find it: https://www.paypal.com/paypalme
 */
const PAYPAL_ME_SLUG = (
  (typeof import.meta !== "undefined" &&
    (import.meta as { env?: { VITE_SIFTAH_PAYPAL_ME?: string } }).env
      ?.VITE_SIFTAH_PAYPAL_ME) ||
  ""
).trim();

const PAYPAL_PAY_URL = PAYPAL_ME_SLUG
  ? `https://www.paypal.com/paypalme/${encodeURIComponent(PAYPAL_ME_SLUG)}/${PAID_USD}`
  : "";

const STORAGE_KEY = "siftah-mobile-v4";

type Role = "user" | "assistant" | "system";
type Msg = { id: string; role: Role; content: string; at: number };

type ServerOpt = {
  id: string;
  /** Public label only — never expose backend ids in the UI */
  label: string;
  blurb: string;
  /** Internal backend model id (not shown to users) */
  backend: string;
  tier: "free" | "paid";
};

/** Public names are Server N. Backend ids stay server-side in the request body only. */
const SERVERS: ServerOpt[] = [
  {
    id: "s1",
    label: "Server 1",
    blurb: "Free · fast",
    backend: "p-e-w/gemma-3-12b-it-heretic",
    tier: "free",
  },
  {
    id: "s2",
    label: "Server 2",
    blurb: "Free · balanced",
    backend: "dphn/Dolphin3.0-Mistral-24B",
    tier: "free",
  },
  {
    id: "s3",
    label: "Server 3",
    blurb: "Free · chat",
    backend: "Sao10K/L3-8B-Stheno-v3.2",
    tier: "free",
  },
  {
    id: "s4",
    label: "Server 4",
    blurb: "Premium · strong",
    backend: "huihui-ai/Huihui-Qwen3.5-27B-abliterated",
    tier: "paid",
  },
  {
    id: "s5",
    label: "Server 5",
    blurb: "Premium · sharp",
    backend: "mlabonne/gemma-3-27b-it-abliterated",
    tier: "paid",
  },
  {
    id: "s6",
    label: "Server 6",
    blurb: "Premium · heavy",
    backend: "huihui-ai/Llama-3.3-70B-Instruct-abliterated",
    tier: "paid",
  },
  {
    id: "s7",
    label: "Server 7",
    blurb: "Premium · agentic",
    backend: "NousResearch/Hermes-3-Llama-3.1-70B",
    tier: "paid",
  },
];

type Persist = {
  freeLeft: number;
  paidLeft: number;
  serverId: string;
  messages: Msg[];
};

function loadPersist(): Persist {
  const defaults: Persist = {
    freeLeft: FREE_CREDITS,
    paidLeft: 0,
    serverId: SERVERS[0].id,
    messages: [],
  };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const p = JSON.parse(raw) as Partial<Persist>;
    const serverId = SERVERS.some((s) => s.id === p.serverId)
      ? (p.serverId as string)
      : SERVERS[0].id;
    return {
      freeLeft: Math.max(0, Number(p.freeLeft) ?? FREE_CREDITS),
      paidLeft: Math.max(0, Number(p.paidLeft) || 0),
      serverId,
      messages: Array.isArray(p.messages) ? p.messages.slice(-80) : [],
    };
  } catch {
    return defaults;
  }
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function SiftahPage() {
  const [ready, setReady] = useState(false);
  const [freeLeft, setFreeLeft] = useState(FREE_CREDITS);
  const [paidLeft, setPaidLeft] = useState(0);
  const [serverId, setServerId] = useState(SERVERS[0].id);
  const [showPay, setShowPay] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const totalCredits = freeLeft + paidLeft;
  const locked = totalCredits < CREDITS_PER_MSG;
  const unlockedPremium = paidLeft > 0;

  const availableServers = useMemo(
    () => SERVERS.filter((s) => s.tier === "free" || unlockedPremium),
    [unlockedPremium],
  );
  const server = useMemo(
    () => availableServers.find((s) => s.id === serverId) ?? availableServers[0] ?? SERVERS[0],
    [availableServers, serverId],
  );

  useEffect(() => {
    const p = loadPersist();
    setFreeLeft(p.freeLeft);
    setPaidLeft(p.paidLeft);
    setServerId(p.serverId);
    setMessages(p.messages);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ freeLeft, paidLeft, serverId, messages } satisfies Persist),
    );
  }, [ready, freeLeft, paidLeft, serverId, messages]);

  useEffect(() => {
    if (!availableServers.some((s) => s.id === serverId)) {
      setServerId(availableServers[0]?.id ?? SERVERS[0].id);
    }
  }, [availableServers, serverId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  function spendCredits(amount: number) {
    setFreeLeft((f) => {
      const fromFree = Math.min(f, amount);
      const rest = amount - fromFree;
      if (rest > 0) setPaidLeft((p) => Math.max(0, p - rest));
      return f - fromFree;
    });
  }

  function claimPaidPack() {
    setPaidLeft((n) => n + PAID_CREDITS);
    setShowPay(false);
    setError(null);
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    if (locked) {
      setError(`Out of credits. $${PAID_USD} unlocks ${PAID_CREDITS} credits (25 replies) + premium servers.`);
      setShowPay(true);
      return;
    }

    setError(null);
    setInput("");
    const userMsg: Msg = { id: uid(), role: "user", content: text, at: Date.now() };
    setMessages((m) => [...m, userMsg]);
    spendCredits(CREDITS_PER_MSG);
    setBusy(true);

    try {
      const history = [...messages, userMsg]
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/siftah/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: server.backend,
          messages: history,
          trial: freeLeft > 0,
        }),
      });

      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);

      const reply = (data.reply || "").trim() || "(empty reply)";
      setMessages((m) => [
        ...m,
        { id: uid(), role: "assistant", content: reply, at: Date.now() },
      ]);
      spendCredits(CREDITS_PER_MSG);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      setMessages((m) => [
        ...m,
        { id: uid(), role: "assistant", content: `⚠ ${msg}`, at: Date.now() },
      ]);
      spendCredits(CREDITS_PER_MSG);
    } finally {
      setBusy(false);
    }
  }

  function clearChat() {
    setMessages([]);
    setError(null);
  }

  const repliesLeft = Math.floor(totalCredits / (CREDITS_PER_MSG * 2));
  const creditLabel =
    totalCredits <= 0 ? "0 credits" : `${totalCredits} credits · ~${repliesLeft} replies`;

  return (
    <AppShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-6 py-8 sm:py-10">
        <header className="flex flex-col items-center text-center">
          <SiftahLogo />
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Unrestricted AI chat. Free trial on standard servers — then ${PAID_USD} for{" "}
            {PAID_CREDITS} credits (50 messages / 25 replies) and premium servers.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            <SiteDomainLine />
          </p>
        </header>

        <section className="rounded-2xl border border-red-500/25 bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <label className="block min-w-0 flex-1 text-left">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Server
              </span>
              <select
                value={server.id}
                onChange={(e) => setServerId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-red-500"
              >
                {availableServers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} — {s.blurb}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold",
                  locked
                    ? "bg-red-600 text-white"
                    : totalCredits <= CREDITS_PER_MSG * 4
                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                      : "bg-red-500/15 text-red-700 dark:text-red-300",
                )}
              >
                {creditLabel}
              </span>
              <button
                type="button"
                onClick={() => setShowPay((v) => !v)}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-secondary"
              >
                ${PAID_USD} top-up
              </button>
              <button
                type="button"
                onClick={clearChat}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-secondary"
              >
                Clear
              </button>
            </div>
          </div>

          {showPay && (
            <div className="mt-4 space-y-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">
              <p className="font-semibold">
                ${PAID_USD} USD → {PAID_CREDITS} credits + premium servers
              </p>
              <p className="text-xs text-muted-foreground">
                2 credits per message, both ways → 50 messages / <strong>25 replies</strong>. Note:{" "}
                <span className="font-mono">Siftah {PAID_CREDITS}</span>.
              </p>
              <div className="flex flex-wrap gap-2">
                {PAYPAL_PAY_URL ? (
                  <a
                    href={PAYPAL_PAY_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-xl bg-[#0070ba] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#005ea6]"
                  >
                    Pay ${PAID_USD} on PayPal
                  </a>
                ) : (
                  <span className="inline-flex rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-amber-800 dark:text-amber-200">
                    Pay link not configured yet — use I've paid after sending ${PAID_USD}
                  </span>
                )}
                <button
                  type="button"
                  onClick={claimPaidPack}
                  className="inline-flex rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
                >
                  I've paid — add {PAID_CREDITS} credits
                </button>
              </div>
            </div>
          )}

          {locked && (
            <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm">
              <p className="font-semibold text-red-700 dark:text-red-300">No credits left</p>
              <p className="mt-1 text-muted-foreground">
                ${PAID_USD} → {PAID_CREDITS} credits (25 replies) and premium servers (4–7).
              </p>
              <button
                type="button"
                onClick={() => setShowPay(true)}
                className="mt-3 inline-flex rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
              >
                Top up ${PAID_USD}
              </button>
            </div>
          )}
        </section>

        <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="text-left">
              <p className="text-sm font-bold">{server.label}</p>
              <p className="text-xs text-muted-foreground">{server.blurb}</p>
            </div>
            {busy && (
              <span className="flex items-center gap-2 text-xs font-semibold text-red-600">
                <span className="size-2 animate-pulse rounded-full bg-red-500" />
                Thinking…
              </span>
            )}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-6 text-center text-sm text-muted-foreground">
                Pick a server and ask anything. Free: Servers 1–3. Premium (after top-up): 4–7.
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[92%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                  m.role === "user"
                    ? "ml-auto bg-red-600 text-white"
                    : "mr-auto border border-border bg-background",
                )}
              >
                {m.content}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border p-3">
            {error && (
              <p className="mb-2 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
            )}
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={busy || locked}
                placeholder={locked ? `Out of credits — $${PAID_USD} top-up` : "Message Siftah…"}
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-red-500 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={busy || locked || !input.trim()}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </section>

        <p className="pb-4 text-center text-sm font-semibold tracking-wide">
          <SiteDomainLine className="text-muted-foreground" />
        </p>
      </div>
    </AppShell>
  );
}

function SiftahLogo() {
  return (
    <div className="select-none" aria-label="Siftah Mobile">
      <div
        className="mx-auto flex w-full max-w-[280px] flex-col items-center justify-center rounded-2xl border-2 border-red-600 bg-white px-6 py-4 shadow-sm dark:bg-neutral-950"
        style={{ fontFamily: '"Arial Black", Impact, system-ui, sans-serif' }}
      >
        <span className="text-[clamp(1.75rem,6vw,2.35rem)] font-black leading-none tracking-tight text-red-600">
          SIFTAH
        </span>
        <span className="mt-1 text-[clamp(1.1rem,4vw,1.45rem)] font-black leading-none tracking-[0.18em] text-neutral-900 dark:text-white">
          MOBILE
        </span>
      </div>
    </div>
  );
}
