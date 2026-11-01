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
          "Siftah Mobile — free trial on budget open models, then $5 for more messages and stronger models.",
      },
    ],
  }),
  component: SiftahPage,
});

/** Free trial: 10 user messages on budget models only. */
const FREE_TRIAL = 10;
/** One-off pack after trial: $5 → 100 extra user messages (10× free). */
const PAID_PACK = 100;
const PAID_USD = 5;

/**
 * Put your real PayPal.me slug here (no @).
 * Link becomes https://paypal.me/{slug}/5
 * Example: "gjphillips" → paypal.me/gjphillips/5
 * Or set VITE_SIFTAH_PAYPAL_ME in env if you prefer.
 */
const PAYPAL_ME_SLUG =
  (typeof import.meta !== "undefined" &&
    (import.meta as { env?: { VITE_SIFTAH_PAYPAL_ME?: string } }).env
      ?.VITE_SIFTAH_PAYPAL_ME) ||
  "looterscomputas";

const PAYPAL_PAY_URL = `https://www.paypal.com/paypalme/${PAYPAL_ME_SLUG}/${PAID_USD}`;

const STORAGE_KEY = "siftah-mobile-v2";

type Role = "user" | "assistant" | "system";
type Msg = { id: string; role: Role; content: string; at: number };

type ModelOpt = {
  id: string;
  label: string;
  blurb: string;
  hf: string;
  /** free = trial pool; paid = only after $5 pack or BYO token */
  tier: "free" | "paid";
};

/**
 * Free tier = smaller / cheaper Inference routes (still decent, not toy models).
 * Paid tier = larger abliterated / uncensored checkpoints.
 */
const MODELS: ModelOpt[] = [
  // —— Free / budget ——
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
  // —— Paid (after $5 or BYO HF token) ——
  {
    id: "qwen35-27b-ablit",
    label: "Qwen3.5 27B Abliterated",
    blurb: "$5 · strong abliterated",
    hf: "huihui-ai/Huihui-Qwen3.5-27B-abliterated",
    tier: "paid",
  },
  {
    id: "gemma3-27b-ablit",
    label: "Gemma 3 27B Abliterated",
    blurb: "$5 · mlabonne",
    hf: "mlabonne/gemma-3-27b-it-abliterated",
    tier: "paid",
  },
  {
    id: "llama33-70b-ablit",
    label: "Llama 3.3 70B Abliterated",
    blurb: "$5 · heavyweight",
    hf: "huihui-ai/Llama-3.3-70B-Instruct-abliterated",
    tier: "paid",
  },
  {
    id: "hermes3-70b",
    label: "Hermes 3 70B",
    blurb: "$5 · general / agentic",
    hf: "NousResearch/Hermes-3-Llama-3.1-70B",
    tier: "paid",
  },
];

type Persist = {
  freeUsed: number;
  paidLeft: number;
  modelId: string;
  byoToken: string;
  messages: Msg[];
};

function loadPersist(): Persist {
  const defaults: Persist = {
    freeUsed: 0,
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
      freeUsed: Number(p.freeUsed) || 0,
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
  const [freeUsed, setFreeUsed] = useState(0);
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
  const freeLeft = Math.max(0, FREE_TRIAL - freeUsed);
  const canSend = hasByo || freeLeft > 0 || paidLeft > 0;
  const locked = !canSend;

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
    setFreeUsed(p.freeUsed);
    setPaidLeft(p.paidLeft);
    setModelId(p.modelId);
    setByoToken(p.byoToken);
    setMessages(p.messages);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const payload: Persist = { freeUsed, paidLeft, modelId, byoToken, messages };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [ready, freeUsed, paidLeft, modelId, byoToken, messages]);

  useEffect(() => {
    if (!availableModels.some((m) => m.id === modelId)) {
      setModelId(availableModels[0]?.id ?? MODELS[0].id);
    }
  }, [availableModels, modelId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  function claimPaidPack() {
    setPaidLeft((n) => n + PAID_PACK);
    setShowPay(false);
    setError(null);
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    if (locked) {
      setError(`Trial done. Pay $${PAID_USD} for ${PAID_PACK} more messages, or paste your HF token.`);
      setShowPay(true);
      return;
    }

    setError(null);
    setInput("");
    const userMsg: Msg = { id: uid(), role: "user", content: text, at: Date.now() };
    setMessages((m) => [...m, userMsg]);
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

      if (!hasByo) {
        if (freeLeft > 0) setFreeUsed((u) => u + 1);
        else if (paidLeft > 0) setPaidLeft((n) => Math.max(0, n - 1));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      setMessages((m) => [
        ...m,
        { id: uid(), role: "assistant", content: `⚠ ${msg}`, at: Date.now() },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function clearChat() {
    setMessages([]);
    setError(null);
  }

  const creditLabel = hasByo
    ? "BYO token · unlimited"
    : freeLeft > 0
      ? `${freeLeft} free left`
      : paidLeft > 0
        ? `${paidLeft} paid left`
        : "0 left";

  return (
    <AppShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-6 py-8 sm:py-10">
        <header className="flex flex-col items-center text-center">
          <SiftahLogo />
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Free trial: {FREE_TRIAL} messages on budget models. Then ${PAID_USD} via PayPal for{" "}
            {PAID_PACK} more + stronger models — or bring your own HF token.
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
                    : freeLeft <= 3 && paidLeft === 0 && !hasByo
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
                ${PAID_USD} USD → {PAID_PACK} messages + paid models unlocked
              </p>
              <p className="text-xs text-muted-foreground">
                Pay via PayPal. Note: <span className="font-mono">Siftah {PAID_PACK}</span>. Then
                tap “I've paid”.
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={PAYPAL_PAY_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-xl bg-[#0070ba] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#005ea6]"
                >
                  Pay ${PAID_USD} on PayPal
                </a>
                <button
                  type="button"
                  onClick={claimPaidPack}
                  className="inline-flex rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
                >
                  I've paid — add {PAID_PACK} messages
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Honour system for now (credits in this browser). Fix PayPal slug if{" "}
                <span className="font-mono">paypal.me/{PAYPAL_ME_SLUG}</span> is wrong.
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
              <p className="font-semibold text-red-700 dark:text-red-300">No messages left</p>
              <p className="mt-1 text-muted-foreground">
                ${PAID_USD} gets you {PAID_PACK} more messages and the stronger models, or paste an HF
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
                Free trial uses budget models only. After ${PAID_USD} you unlock larger abliterated
                models and {PAID_PACK} extra messages.
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
                  locked ? `Trial over — $${PAID_USD} top-up or HF token` : "Message Siftah…"
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
          Free = cheaper Inference routes. Paid unlocks bigger models.
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
