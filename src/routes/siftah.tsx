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
          "Siftah Mobile — free trial on budget open models, then $4.99 for more messages and stronger models.",
      },
    ],
  }),
  component: SiftahPage,
});

/**
 * Credits: every message counts both ways (user send + assistant reply).
 * Cost = 2 credits per bubble → 100 paid credits = 50 bubbles = 25 full replies.
 */
const CREDITS_PER_MSG = 2;

/** Free trial: 20 credits = 10 bubbles total = 5 full replies on budget models. */
const FREE_CREDITS = 20;

/** $4.99 → 100 credits = 50 messages back-and-forth = 25 replies. */
const PAID_CREDITS = 100;
const PAID_USD = 4.99;

/**
 * Set in Vercel (Production + Preview):
 *   VITE_SIFTAH_PAYPAL_ME = your PayPal.me slug (no @, no URL)
 * Example: gjphillips  →  https://www.paypal.com/paypalme/gjphillips/4.99
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

const STORAGE_KEY = "siftah-mobile-v3";

type Role = "user" | "assistant" | "system";
type Msg = { id: string; role: Role; content: string; at: number };

type ModelOpt = {
  id: string;
  label: string;
  blurb: string;
  hf: string;
  tier: "free" | "paid";
};

const MODELS: ModelOpt[] = [
  {
    id: "gemma3-12b-heretic",
    label: "Gemma 3 12B Heretic",
    blurb: "Free · fast abliterated",
    hf: "p-e-w/gemma-3-12b-it-heretic",
    tier: "free",
  },
  {
    id: "dolphin-mistral-24b",
    label: "Dolphin Mistral 24B",
    blurb: "Free · solid uncensored mid",
    hf: "dphn/Dolphin3.0-Mistral-24B",
    tier: "free",
  },
  {
    id: "stheno-8b",
    label: "Stheno v3.2 8B",
    blurb: "Free · cheap RP / chat",
    hf: "Sao10K/L3-8B-Stheno-v3.2",
    tier: "free",
  },
  {
    id: "qwen35-27b-ablit",
    label: "Qwen3.5 27B Abliterated",
    blurb: "$4.99 · strong abliterated",
    hf: "huihui-ai/Huihui-Qwen3.5-27B-abliterated",
    tier: "paid",
  },
  {
    id: "gemma3-27b-ablit",
    label: "Gemma 3 27B Abliterated",
    blurb: "$4.99 · mlabonne",
    hf: "mlabonne/gemma-3-27b-it-abliterated",
    tier: "paid",
  },
  {
    id: "llama33-70b-ablit",
    label: "Llama 3.3 70B Abliterated",
    blurb: "$4.99 · heavyweight",
    hf: "huihui-ai/Llama-3.3-70B-Instruct-abliterated",
    tier: "paid",
  },
  {
    id: "hermes3-70b",
    label: "Hermes 3 70B",
    blurb: "$4.99 · general / agentic",
    hf: "NousResearch/Hermes-3-Llama-3.1-70B",
    tier: "paid",
  },
];

type Persist = {
  freeLeft: number;
  paidLeft: number;
  modelId: string;
  byoToken: string;
  messages: Msg[];
};

function loadPersist(): Persist {
  const defaults: Persist = {
    freeLeft: FREE_CREDITS,
    paidLeft: 0,
    modelId: MODELS[0].id,
    byoToken: "",
    messages: [],
  };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const p = JSON.parse(raw) as Partial<Persist>;
    const modelId = MODELS.some((m) => m.id === p.modelId) ? (p.modelId as string) : MODELS[0].id;
    return {
      freeLeft: Math.max(0, Number(p.freeLeft) ?? FREE_CREDITS),
      paidLeft: Math.max(0, Number(p.paidLeft) || 0),
      modelId,
      byoToken: typeof p.byoToken === "string" ? p.byoToken : "",
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
  const [modelId, setModelId] = useState(MODELS[0].id);
  const [byoToken, setByoToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const hasByo = byoToken.trim().length > 8;
  const totalCredits = freeLeft + paidLeft;
  const canAffordOneBubble = hasByo || totalCredits >= CREDITS_PER_MSG;
  const locked = !canAffordOneBubble;

  const unlockedPaidModels = hasByo || paidLeft > 0;
  const availableModels = useMemo(
    () => MODELS.filter((m) => m.tier === "free" || unlockedPaidModels),
    [unlockedPaidModels],
  );
  const model = useMemo(
    () => availableModels.find((m) => m.id === modelId) ?? availableModels[0] ?? MODELS[0],
    [availableModels, modelId],
  );

  useEffect(() => {
    const p = loadPersist();
    setFreeLeft(p.freeLeft);
    setPaidLeft(p.paidLeft);
    setModelId(p.modelId);
    setByoToken(p.byoToken);
    setMessages(p.messages);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const payload: Persist = { freeLeft, paidLeft, modelId, byoToken, messages };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [ready, freeLeft, paidLeft, modelId, byoToken, messages]);

  useEffect(() => {
    if (!availableModels.some((m) => m.id === modelId)) {
      setModelId(availableModels[0]?.id ?? MODELS[0].id);
    }
  }, [availableModels, modelId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  /** Spend CREDITS_PER_MSG from free first, then paid. */
  function spendCredits(amount: number) {
    if (hasByo) return;
    setFreeLeft((f) => {
      const fromFree = Math.min(f, amount);
      const rest = amount - fromFree;
      if (rest > 0) {
        setPaidLeft((p) => Math.max(0, p - rest));
      }
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
      setError(
        `Out of credits. $${PAID_USD} → ${PAID_CREDITS} credits (25 replies), or paste your HF token.`,
      );
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
          model: model.hf,
          messages: history,
          token: hasByo ? byoToken.trim() : undefined,
          trial: !hasByo && freeLeft > 0,
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
      // Still charge for the error bubble so spam can't be free — optional; skip if you prefer refund on fail
      spendCredits(CREDITS_PER_MSG);
    } finally {
      setBusy(false);
    }
  }

  function clearChat() {
    setMessages([]);
    setError(null);
  }

  const bubblesLeft = hasByo
    ? null
    : Math.floor(totalCredits / CREDITS_PER_MSG);
  const repliesLeft = hasByo ? null : Math.floor(totalCredits / (CREDITS_PER_MSG * 2));

  const creditLabel = hasByo
    ? "BYO token · unlimited"
    : totalCredits <= 0
      ? "0 credits"
      : `${totalCredits} credits · ~${repliesLeft} replies`;

  return (
    <AppShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-6 py-8 sm:py-10">
        <header className="flex flex-col items-center text-center">
          <SiftahLogo />
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Free trial on budget models. Then ${PAID_USD} → {PAID_CREDITS} credits (50 messages
            back-and-forth / 25 replies) + stronger models — or bring your own HF token.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            <SiteDomainLine />
          </p>
        </header>

        <section className="rounded-2xl border border-red-500/25 bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <label className="block min-w-0 flex-1 text-left">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Model
              </span>
              <select
                value={model.id}
                onChange={(e) => setModelId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-red-500"
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} — {m.blurb}
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
                    : totalCredits <= CREDITS_PER_MSG * 4 && !hasByo
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
                onClick={() => setShowToken((v) => !v)}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-secondary"
              >
                {showToken ? "Hide token" : "HF token"}
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
                ${PAID_USD} USD → {PAID_CREDITS} credits
              </p>
              <p className="text-xs text-muted-foreground">
                {CREDITS_PER_MSG} credits per message, both ways → 50 messages /{" "}
                <strong>25 replies</strong>. Unlocks paid models. Note on payment:{" "}
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
                    Set VITE_SIFTAH_PAYPAL_ME in Vercel to enable the pay link
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
              <p className="text-[11px] text-muted-foreground">
                Honour system (credits in this browser). Env:{" "}
                <span className="font-mono">VITE_SIFTAH_PAYPAL_ME</span>
                {PAYPAL_ME_SLUG ? (
                  <>
                    {" "}= <span className="font-mono">{PAYPAL_ME_SLUG}</span>
                  </>
                ) : (
                  " (not set yet)"
                )}
              </p>
            </div>
          )}

          {showToken && (
            <div className="mt-4 space-y-2 rounded-xl border border-dashed border-border bg-secondary/30 p-3">
              <p className="text-xs text-muted-foreground">
                Optional: your own Hugging Face token. Unlimited, any model tier. Stored only in this
                browser.
              </p>
              <input
                type="password"
                autoComplete="off"
                value={byoToken}
                onChange={(e) => setByoToken(e.target.value)}
                placeholder="hf_…"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-red-500"
              />
            </div>
          )}

          {locked && (
            <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm">
              <p className="font-semibold text-red-700 dark:text-red-300">No credits left</p>
              <p className="mt-1 text-muted-foreground">
                ${PAID_USD} → {PAID_CREDITS} credits (25 replies) + stronger models, or paste an HF
                token.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowPay(true)}
                  className="inline-flex rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                >
                  Top up ${PAID_USD}
                </button>
                <button
                  type="button"
                  onClick={() => setShowToken(true)}
                  className="inline-flex rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
                >
                  Use my HF token
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="text-left">
              <p className="text-sm font-bold">{model.label}</p>
              <p className="text-xs text-muted-foreground">{model.hf}</p>
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
                {bubblesLeft != null ? (
                  <>
                    Free pool: {FREE_CREDITS} credits (~{Math.floor(FREE_CREDITS / (CREDITS_PER_MSG * 2))}{" "}
                    replies). Paid: ${PAID_USD} unlocks larger models + {PAID_CREDITS} credits (25
                    replies).
                  </>
                ) : (
                  "Ask anything."
                )}
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
                placeholder={
                  locked ? `Out of credits — $${PAID_USD} or HF token` : "Message Siftah…"
                }
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

        <p className="text-center text-xs text-muted-foreground">
          2 credits per bubble (yours + the reply). Free = budget models. Paid unlocks bigger ones.
        </p>

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
