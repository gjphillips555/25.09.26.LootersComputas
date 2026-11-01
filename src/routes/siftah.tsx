import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { SiteDomainLine } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/siftah")({
  head: () => ({
    meta: [
      { title: "Siftah Mobile | Looters Computas" },
      {
        name: "description",
        content: "Siftah Mobile — 5 Super Saiyan replies, then 5 automatic Siftah fallback replies, followed by a five-hour cooldown.",
      },
    ],
  }),
  component: SiftahPage,
});

const FREE_SUPER_SAIYAN = 5;
const FREE_SIFTAH = 5;
const COOLDOWN_MS = 5 * 60 * 60 * 1000;
const CHAT_STORAGE_KEY = "siftah-mobile-chat-v5";

type Role = "user" | "assistant";
type Msg = { id: string; role: Role; content: string; at: number };
type Usage = {
  superSaiyanUsed: number;
  siftahUsed: number;
  cooldownUntil: string | null;
  creditsBalance: number;
};
type ApiResponse = {
  reply?: string;
  error?: string;
  code?: string;
  stage?: "super_saiyan" | "siftah";
  modelUsed?: string;
  usage?: Usage;
  failoverPool?: number;
};

const SUPER_SAIYAN_OPTIONS = [
  { label: "Super Saiyan 1", model: "p-e-w/gemma-3-12b-it-heretic" },
  { label: "Super Saiyan 2", model: "dphn/Dolphin3.0-Mistral-24B" },
  { label: "Super Saiyan 3", model: "Sao10K/L3-8B-Stheno-v3.2" },
] as const;

const DEFAULT_USAGE: Usage = {
  superSaiyanUsed: 0,
  siftahUsed: 0,
  cooldownUntil: null,
  creditsBalance: 0,
};

function readMessages(): Msg[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.slice(-80) : [];
  } catch {
    return [];
  }
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function SiftahPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [usage, setUsage] = useState<Usage>(DEFAULT_USAGE);
  const [model, setModel] = useState<string>(SUPER_SAIYAN_OPTIONS[0].model);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [lastRoute, setLastRoute] = useState("Ready");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const cooldownUntil = usage.cooldownUntil ? new Date(usage.cooldownUntil).getTime() : 0;
  const locked = cooldownUntil > now && usage.creditsBalance < 2;
  const superSaiyanLeft = Math.max(0, FREE_SUPER_SAIYAN - usage.superSaiyanUsed);
  const siftahLeft = Math.max(0, FREE_SIFTAH - usage.siftahUsed);
  const totalFreeLeft = superSaiyanLeft + siftahLeft;
  const cooldownLabel = locked
    ? formatDuration(cooldownUntil - now)
    : null;

  useEffect(() => {
    setMessages(readMessages());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    void refreshUsage();
    const params = new URLSearchParams(window.location.search);
    const paypalStatus = params.get("paypal");
    const orderId = params.get("token");
    if (paypalStatus === "success" && orderId) {
      setCheckoutBusy(true);
      fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "PayPal payment could not be confirmed.");
          setError(null);
          await refreshUsage();
          setLastRoute("Credits added to your account");
        })
        .catch((cause) => setError(cause instanceof Error ? cause.message : "Payment confirmation failed."))
        .finally(() => {
          setCheckoutBusy(false);
          window.history.replaceState({}, "", window.location.pathname);
        });
    } else if (paypalStatus === "cancelled") {
      setError("PayPal checkout was cancelled. No Credits were added.");
      window.history.replaceState({}, "", window.location.pathname);
    }
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-80)));
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function refreshUsage() {
    try {
      const response = await fetch("/api/siftah/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status" }),
      });
      const data = (await response.json()) as ApiResponse;
      if (response.status === 401) {
        setAuthRequired(true);
        return;
      }
      if (data.usage) setUsage(data.usage);
    } catch {
      // Chat remains usable; the server enforces the actual allowance.
    }
  }

  async function buyCredits(packageId: "starter" | "standard" | "premium") {
    if (checkoutBusy || authRequired) return;
    setCheckoutBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await response.json();
      if (!response.ok || !data.approvalUrl) throw new Error(data.error || "Could not start PayPal checkout.");
      window.location.assign(data.approvalUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start PayPal checkout.");
      setCheckoutBusy(false);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    if (locked) {
      setError(`Your free replies refresh in ${cooldownLabel}.`);
      return;
    }

    setError(null);
    setInput("");
    const userMessage: Msg = { id: uid(), role: "user", content: text, at: Date.now() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setBusy(true);
    setLastRoute("Connecting…");

    try {
      const history = nextMessages
        .slice(-12)
        .map((message) => ({ role: message.role, content: message.content }));
      const response = await fetch("/api/siftah/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chat", model, messages: history }),
      });
      const data = (await response.json()) as ApiResponse;
      if (data.usage) setUsage(data.usage);
      if (response.status === 401) {
        setAuthRequired(true);
        throw new Error("Please sign in before using Siftah.");
      }
      if (!response.ok) {
        if (data.code === "FREE_LIMIT") setError(data.error || "Your free allowance is used up.");
        throw new Error(data.error || `Request failed (${response.status})`);
      }

      const routeLabel = data.stage === "siftah"
        ? `Siftah failover · ${data.modelUsed || "one of 1–5"}`
        : `Super Saiyan · ${data.modelUsed || "ready"}`;
      setLastRoute(routeLabel);
      setMessages((current) => [
        ...current,
        { id: uid(), role: "assistant", content: data.reply || "(empty reply)", at: Date.now() },
      ]);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Something went wrong.";
      setError(message);
    } finally {
      setBusy(false);
      await refreshUsage();
    }
  }

  function clearChat() {
    setMessages([]);
    setError(null);
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-5 py-8 sm:py-10">
        <header className="flex flex-col items-center text-center">
          <SiftahLogo />
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Your free allowance gives you 5 Super Saiyan replies, followed by 5 more replies
            through the Siftah 1–5 backup pool. If a Siftah is busy or unavailable, another
            automatically takes over.
          </p>
          <p className="mt-2 text-xs text-muted-foreground"><SiteDomainLine /></p>
        </header>

        <section className="rounded-2xl border border-red-500/25 bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your free replies</p>
              <p className="mt-1 text-sm font-bold">
                {locked ? "Five-hour cooldown" : totalFreeLeft > 0 ? `${totalFreeLeft} free replies remaining` : "Free allowance complete"}
              </p>
            </div>
            <span className={cn(
              "rounded-full px-3 py-1 text-xs font-bold",
              locked ? "bg-red-600 text-white" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
            )}>
              {locked ? `Refreshes in ${cooldownLabel}` : "Free tier available"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <UsageMeter
              title="Super Saiyan"
              used={usage.superSaiyanUsed}
              total={FREE_SUPER_SAIYAN}
              description="First five replies"
            />
            <UsageMeter
              title="Siftah 1–5"
              used={usage.siftahUsed}
              total={FREE_SIFTAH}
              description="Five more replies with automatic failover"
            />
          </div>

          {locked ? (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm">
              You've used all 10 free replies. Your allowance will reset automatically in {cooldownLabel}.
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-border bg-background/60 p-3 text-xs text-muted-foreground">
              The five-hour cooldown starts after your tenth free reply. Your allowance is tied to your
              signed-in account, not this browser, so refreshing the page won't reset it.
            </div>
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            Purchased Credits remain in your account and can be used after the free allowance is exhausted.
          </p>
        </section>

        <section className="rounded-2xl border border-amber-500/25 bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Purchased balance</p>
              <p className="mt-1 text-2xl font-black tabular-nums">{usage.creditsBalance} Credits</p>
              <p className="mt-1 text-xs text-muted-foreground">2 Credits are used for each AI response after your free allowance.</p>
            </div>
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">PayPal · NZD</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { id: "starter" as const, name: "Starter", credits: 40, price: "NZ$4.99", replies: "20 AI responses" },
              { id: "standard" as const, name: "Standard", credits: 100, price: "NZ$9.99", replies: "50 AI responses" },
              { id: "premium" as const, name: "Premium", credits: 200, price: "NZ$19.99", replies: "100 AI responses" },
            ].map((pack) => (
              <div key={pack.id} className="rounded-xl border border-border bg-background/70 p-3">
                <p className="text-sm font-bold">{pack.name}</p>
                <p className="mt-1 text-xl font-black">{pack.credits} Credits</p>
                <p className="text-xs text-muted-foreground">{pack.replies}</p>
                <p className="mt-3 text-lg font-bold">{pack.price}</p>
                <button
                  type="button"
                  onClick={() => void buyCredits(pack.id)}
                  disabled={checkoutBusy || authRequired}
                  className="mt-3 w-full rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50"
                >
                  {checkoutBusy ? "Please wait…" : "Buy Credits"}
                </button>
              </div>
            ))}
          </div>
          {authRequired && <p className="mt-3 text-xs text-muted-foreground">Sign in to purchase and save Credits to your account.</p>}
          <p className="mt-3 text-xs text-muted-foreground">Credits are added only after PayPal confirms the payment. Checkout is in New Zealand dollars.</p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <label className="block text-left">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Super Saiyan model
            </span>
            <select
              value={model}
              onChange={(event) => setModel(event.target.value)}
              disabled={busy}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-red-500 disabled:opacity-60"
            >
              {SUPER_SAIYAN_OPTIONS.map((option) => (
                <option key={option.model} value={option.model}>{option.label}</option>
              ))}
            </select>
          </label>
          <p className="mt-3 text-xs text-muted-foreground">
            During the Siftah stage, the app automatically tries five backup models in rotation.
            You don't need to select or switch them yourself.
          </p>
        </section>

        <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-bold">Siftah Mobile</p>
              <p className="text-xs text-muted-foreground">{lastRoute}</p>
            </div>
            <button
              type="button"
              onClick={clearChat}
              disabled={busy}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
            >
              Clear chat
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && !busy && (
              <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-6 text-center text-sm text-muted-foreground">
                Start a conversation. You'll get five Super Saiyan replies, then five Siftah backup replies.
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  message.role === "user"
                    ? "ml-auto bg-red-600 text-white"
                    : "mr-auto border border-border bg-background",
                )}
              >
                {message.content}
              </div>
            ))}
            {busy && (
              <div className="mr-auto flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                <Spinner className="size-4 text-red-600" />
                {lastRoute === "Connecting…" ? "Connecting…" : "Generating reply…"}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border p-3">
            {error && <p className="mb-2 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
            {authRequired && (
              <p className="mb-2 text-xs text-muted-foreground">
                <Link to="/login" className="font-semibold text-red-600 underline">Sign in</Link> to use your personal Siftah allowance.
              </p>
            )}
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={busy || locked || authRequired}
                placeholder={locked ? `Free allowance refreshes in ${cooldownLabel}` : "Message Siftah…"}
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-red-500 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={busy || locked || authRequired || !input.trim()}
                className="inline-flex min-w-[5.5rem] items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? <Spinner className="size-4" /> : "Send"}
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

function UsageMeter({ title, used, total, description }: {
  title: string;
  used: number;
  total: number;
  description: string;
}) {
  const remaining = Math.max(0, total - used);
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs font-semibold tabular-nums">{remaining}/{total} left</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-red-600 transition-all"
          style={{ width: `${Math.min(100, (used / total) * 100)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
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
