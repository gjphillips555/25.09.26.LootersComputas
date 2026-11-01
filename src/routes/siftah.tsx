import { useEffect, useMemo, useRef, useState } from "react";
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
        content:
          "Siftah Mobile — chat with selectable unrestricted open models. Free trial, then sign up or bring your own Hugging Face token.",
      },
    ],
  }),
  component: SiftahPage,
});

const FREE_TRIAL = 10;
const STORAGE_KEY = "siftah-mobile-v1";

type Role = "user" | "assistant" | "system";
type Msg = { id: string; role: Role; content: string; at: number };

type ModelOpt = {
  id: string;
  label: string;
  blurb: string;
  /** Hugging Face model id for Inference Providers / router */
  hf: string;
};

/**
 * Prefer the largest checkpoints that are actually reachable via HF Inference
 * Providers (Featherless / router, etc.). Size is irrelevant when a provider hosts it.
 * GGUF-only packs (e.g. SC117 Qwen3.8 Flash ~80GB) are download/local only — not listed.
 * Availability can change; swap IDs if a provider drops a route.
 */
const MODELS: ModelOpt[] = [
  {
    id: "llama33-70b-ablit",
    label: "Llama 3.3 70B Abliterated",
    blurb: "Largest common abliterated Llama · HF Inference",
    hf: "huihui-ai/Llama-3.3-70B-Instruct-abliterated",
  },
  {
    id: "hermes3-70b",
    label: "Hermes 3 70B",
    blurb: "Strong general / agentic · low refusal",
    hf: "NousResearch/Hermes-3-Llama-3.1-70B",
  },
  {
    id: "euryale-70b",
    label: "Euryale v2.3 70B",
    blurb: "Creative / RP heavyweight",
    hf: "Sao10K/L3-70B-Euryale-v2.3",
  },
  {
    id: "magnum-72b",
    label: "Magnum v4 72B",
    blurb: "~72B creative line",
    hf: "anthracite-org/magnum-v4-72b",
  },
  {
    id: "dolphin-70b",
    label: "Dolphin 2.1 70B",
    blurb: "Classic uncensored fine-tune · Featherless",
    hf: "dphn/dolphin-2.1-70b",
  },
  {
    id: "qwen35-27b-ablit",
    label: "Qwen3.5 27B Abliterated",
    blurb: "Top abliterated Qwen tier on HF Inference",
    hf: "huihui-ai/Huihui-Qwen3.5-27B-abliterated",
  },
  {
    id: "qwen35-27b-derestrict",
    label: "Qwen3.5 27B Derestricted",
    blurb: "ArliAI derestricted 27B",
    hf: "ArliAI/Qwen3.5-27B-Derestricted",
  },
  {
    id: "gemma3-27b-ablit",
    label: "Gemma 3 27B Abliterated",
    blurb: "mlabonne abliteration · well known",
    hf: "mlabonne/gemma-3-27b-it-abliterated",
  },
  {
    id: "dolphin-mistral-24b",
    label: "Dolphin Mistral 24B",
    blurb: "Dolphin 3 · solid mid-large uncensored",
    hf: "dphn/Dolphin3.0-Mistral-24B",
  },
  {
    id: "gemma3-12b-heretic",
    label: "Gemma 3 12B Heretic",
    blurb: "Smaller / faster heretic abliteration",
    hf: "p-e-w/gemma-3-12b-it-heretic",
  },
];

type Persist = {
  used: number;
  modelId: string;
  byoToken: string;
  messages: Msg[];
};

function loadPersist(): Persist {
  if (typeof window === "undefined") {
    return { used: 0, modelId: MODELS[0].id, byoToken: "", messages: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { used: 0, modelId: MODELS[0].id, byoToken: "", messages: [] };
    const p = JSON.parse(raw) as Persist;
    const modelId = MODELS.some((m) => m.id === p.modelId) ? p.modelId : MODELS[0].id;
    return {
      used: Number(p.used) || 0,
      modelId,
      byoToken: typeof p.byoToken === "string" ? p.byoToken : "",
      messages: Array.isArray(p.messages) ? p.messages.slice(-80) : [],
    };
  } catch {
    return { used: 0, modelId: MODELS[0].id, byoToken: "", messages: [] };
  }
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function SiftahPage() {
  const [ready, setReady] = useState(false);
  const [used, setUsed] = useState(0);
  const [modelId, setModelId] = useState(MODELS[0].id);
  const [byoToken, setByoToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const model = useMemo(
    () => MODELS.find((m) => m.id === modelId) ?? MODELS[0],
    [modelId],
  );

  const remaining = Math.max(0, FREE_TRIAL - used);
  const hasByo = byoToken.trim().length > 8;
  const locked = remaining <= 0 && !hasByo;

  useEffect(() => {
    const p = loadPersist();
    setUsed(p.used);
    setModelId(p.modelId);
    setByoToken(p.byoToken);
    setMessages(p.messages);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const payload: Persist = { used, modelId, byoToken, messages };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [ready, used, modelId, byoToken, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    if (locked) {
      setError("Free trial finished. Sign up, or paste your Hugging Face token to continue.");
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
          trial: !hasByo,
        }),
      });

      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);

      const reply = (data.reply || "").trim() || "(empty reply)";
      setMessages((m) => [
        ...m,
        { id: uid(), role: "assistant", content: reply, at: Date.now() },
      ]);
      if (!hasByo) setUsed((u) => u + 1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          content: `⚠ ${msg}`,
          at: Date.now(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function clearChat() {
    setMessages([]);
    setError(null);
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-6 py-8 sm:py-10">
        <header className="flex flex-col items-center text-center">
          <SiftahLogo />
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Chat with the largest open models that have public Hugging Face Inference.
            Free trial of {FREE_TRIAL} messages, then sign up or bring your own HF token.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            <SiteDomainLine />
          </p>
        </header>

        <section className="rounded-2xl border border-red-500/25 bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <label className="block min-w-0 flex-1 text-left">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Model backend (largest first)
              </span>
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-red-500"
              >
                {MODELS.map((m) => (
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
                    : remaining <= 3
                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                      : "bg-red-500/15 text-red-700 dark:text-red-300",
                )}
              >
                {hasByo ? "BYO token · unlimited" : `${remaining} free left`}
              </span>
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

          {showToken && (
            <div className="mt-4 space-y-2 rounded-xl border border-dashed border-border bg-secondary/30 p-3">
              <p className="text-xs text-muted-foreground">
                Optional: paste a Hugging Face access token (needs Inference Providers access).
                Stored only in this browser.
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
              <p className="font-semibold text-red-700 dark:text-red-300">Trial finished</p>
              <p className="mt-1 text-muted-foreground">
                Create a Looters account to continue on the shared pool, or paste your own HF token above.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to="/login"
                  className="inline-flex rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                >
                  Sign up / log in
                </Link>
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
                Ask anything. Default is the largest abliterated model with public Inference.
                Provider routes can change — if a call fails, try the next model down.
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
                placeholder={locked ? "Trial over — sign up or add HF token" : "Message Siftah…"}
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
          Models are third-party open weights served by Hugging Face Inference Providers when available.
          Giant GGUF-only packs (e.g. SC117 Qwen3.8 Flash) need local hardware — not listed here.
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
