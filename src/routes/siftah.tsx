import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUp, Check, ChevronDown, Copy, Download, FileCode2,
  PanelRightClose, PanelRightOpen, Plus, Sparkles, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/siftah")({
  head: () => ({
    meta: [
      { title: "Siftah Mobile | Looters Computas" },
      { name: "description", content: "Siftah Mobile — Super Saiyan and Siftah AI chat." },
      { name: "theme-color", content: "#09090b" },
      { name: "color-scheme", content: "dark" },
    ],
  }),
  component: SiftahPage,
});

const CHAT_STORAGE_KEY = "siftah-mobile-conversations-v6";
const THEME_STORAGE_KEY = "siftah-mobile-accent-v1";
const FREE_SUPER_SAIYAN = 5;
const FREE_SIFTAH = 5;

type Role = "user" | "assistant";
type Msg = { id: string; role: Role; content: string; at: number };
type Conversation = { id: string; title: string; messages: Msg[]; updatedAt: number };
type Mode = "account" | "guest";
type Usage = { superSaiyanUsed: number; siftahUsed: number; cooldownUntil: string | null; creditsBalance: number };
type ApiResponse = {
  reply?: string; error?: string; code?: string;
  stage?: "super_saiyan" | "siftah" | "paid"; modelUsed?: string;
  usage?: Usage; mode?: Mode; creditsCharged?: number;
};
type Artifact = { id: string; name: string; language: string; code: string };

const PALETTES = [
  { id: "red", label: "Red", value: "#ef4444" },
  { id: "blue", label: "Blue", value: "#3b82f6" },
  { id: "green", label: "Green", value: "#22c55e" },
  { id: "yellow", label: "Yellow", value: "#eab308" },
  { id: "gold", label: "Gold", value: "#d6a84b" },
  { id: "purple", label: "Purple", value: "#a855f7" },
  { id: "teal", label: "Teal", value: "#14b8a6" },
] as const;

const DEFAULT_USAGE: Usage = { superSaiyanUsed: 0, siftahUsed: 0, cooldownUntil: null, creditsBalance: 0 };

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function newConversation(): Conversation {
  return { id: makeId(), title: "New chat", messages: [], updatedAt: Date.now() };
}

function readConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === "string" && Array.isArray(item.messages)).slice(0, 30);
  } catch {
    return [];
  }
}

function SiftahPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [usage, setUsage] = useState<Usage>(DEFAULT_USAGE);
  const [mode, setMode] = useState<Mode | null>(null);
  const [authState, setAuthState] = useState<"checking" | "signed_out" | "ready">("checking");
  const [busy, setBusy] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRoute, setLastRoute] = useState("Ready");
  const [now, setNow] = useState(Date.now());
  const [paletteId, setPaletteId] = useState<(typeof PALETTES)[number]["id"]>("red");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [activeArtifactId, setActiveArtifactId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = conversations.find((conversation) => conversation.id === activeId) ?? null;
  const messages = activeConversation?.messages ?? [];
  const palette = PALETTES.find((item) => item.id === paletteId) ?? PALETTES[0];
  const artifacts = useMemo(() => extractArtifacts(messages), [messages]);
  const activeArtifact = artifacts.find((artifact) => artifact.id === activeArtifactId) ?? artifacts[0] ?? null;
  const cooldownUntil = usage.cooldownUntil ? new Date(usage.cooldownUntil).getTime() : 0;
  const locked = cooldownUntil > now && usage.creditsBalance < 2;
  const superSaiyanLeft = Math.max(0, FREE_SUPER_SAIYAN - usage.superSaiyanUsed);
  const siftahLeft = Math.max(0, FREE_SIFTAH - usage.siftahUsed);
  const totalFreeLeft = superSaiyanLeft + siftahLeft;
  const cooldownLabel = locked ? formatDuration(cooldownUntil - now) : null;

  useEffect(() => {
    const saved = readConversations();
    const initial = saved.length ? saved : [newConversation()];
    setConversations(initial);
    setActiveId(initial[0].id);
    setHydrated(true);
    const savedPalette = localStorage.getItem(THEME_STORAGE_KEY);
    if (PALETTES.some((item) => item.id === savedPalette)) {
      setPaletteId(savedPalette as (typeof PALETTES)[number]["id"]);
    }
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
    if (hydrated) localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(conversations.slice(0, 30)));
  }, [conversations, hydrated]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, paletteId);
  }, [paletteId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  useEffect(() => {
    if (artifacts.length) {
      setActiveArtifactId((current) => artifacts.some((item) => item.id === current) ? current : artifacts[0].id);
      setPanelOpen(true);
    }
  }, [artifacts]);

  async function refreshUsage() {
    try {
      const response = await fetch("/api/siftah/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status" }),
      });
      const data = (await response.json()) as ApiResponse;
      if (response.status === 401) {
        setAuthState("signed_out");
        setMode(null);
        return;
      }
      if (!response.ok) throw new Error(data.error || "Could not load Siftah.");
      if (data.usage) setUsage(data.usage);
      setMode(data.mode ?? "account");
      setAuthState("ready");
    } catch {
      setAuthState("signed_out");
      setMode(null);
    }
  }

  async function continueAsGuest() {
    setGuestBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/siftah/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "guest" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Guest mode could not be started.");
      await refreshUsage();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Guest mode could not be started.");
    } finally {
      setGuestBusy(false);
    }
  }

  function updateConversation(nextMessages: Msg[]) {
    if (!activeId) return;
    setConversations((current) => current.map((conversation) => {
      if (conversation.id !== activeId) return conversation;
      const firstUser = nextMessages.find((message) => message.role === "user");
      const title = conversation.title === "New chat" && firstUser
        ? firstUser.content.slice(0, 34) + (firstUser.content.length > 34 ? "…" : "")
        : conversation.title;
      return { ...conversation, title, messages: nextMessages, updatedAt: Date.now() };
    }));
  }

  function createConversation() {
    const conversation = newConversation();
    setConversations((current) => [conversation, ...current].slice(0, 30));
    setActiveId(conversation.id);
    setError(null);
    setInput("");
    setMobilePanelOpen(false);
  }

  async function send() {
    const text = input.trim();
    if (!text || busy || authState !== "ready" || locked) return;
    setError(null);
    setInput("");
    const userMessage: Msg = { id: makeId(), role: "user", content: text, at: Date.now() };
    const nextMessages = [...messages, userMessage];
    updateConversation(nextMessages);
    setBusy(true);
    setLastRoute("Connecting…");
    try {
      const history = nextMessages.slice(-12).map((message) => ({ role: message.role, content: message.content }));
      const response = await fetch("/api/siftah/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chat", messages: history }),
      });
      const data = (await response.json()) as ApiResponse;
      if (data.usage) setUsage(data.usage);
      if (response.status === 401) {
        setAuthState("signed_out");
        throw new Error("Choose Guest mode or sign in to continue.");
      }
      if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
      setMode(data.mode ?? mode);
      setLastRoute(data.stage === "super_saiyan"
        ? "Super Saiyan · Abliterated model"
        : data.stage === "paid"
          ? "Credits · Siftah model pool"
          : "Siftah · Automatic model pool");
      updateConversation([
        ...nextMessages,
        { id: makeId(), role: "assistant", content: data.reply || "(No response returned)", at: Date.now() },
      ]);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Something went wrong.";
      setError(message);
      updateConversation(nextMessages);
    } finally {
      setBusy(false);
      await refreshUsage();
    }
  }

  async function buyCredits(packageId: "starter" | "standard" | "premium") {
    if (checkoutBusy || mode !== "account") return;
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

  async function copyArtifact() {
    if (!activeArtifact) return;
    try {
      await navigator.clipboard.writeText(activeArtifact.code);
      setLastRoute("Code copied");
    } catch {
      setError("Clipboard access is unavailable in this browser.");
    }
  }

  function downloadArtifact() {
    if (!activeArtifact) return;
    const blob = new Blob([activeArtifact.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = activeArtifact.name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const shellStyle = { "--siftah-accent": palette.value } as CSSProperties;

  if (authState === "checking") {
    return <div className="siftah-app dark grid min-h-dvh place-items-center" style={shellStyle}>
      <div className="flex items-center gap-3 text-sm text-zinc-400"><Spinner /> Connecting to Siftah Mobile…</div>
    </div>;
  }

  if (authState === "signed_out") {
    return (
      <div className="siftah-app dark min-h-dvh px-4 py-10" style={shellStyle}>
        <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center text-center">
          <SiftahWordmark />
          <h1 className="mt-9 text-2xl font-semibold text-white">Your AI workspace</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">
            Sign in with your Looters Computas account to keep your allowance and Credits with you, or try Siftah in Guest mode.
          </p>
          <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
            <Link to="/login?callbackURL=%2Fsiftah"
              className="flex min-h-12 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white transition hover:brightness-110"
              style={{ backgroundColor: palette.value }}>
              Sign in to Looters
            </Link>
            <button type="button" onClick={() => void continueAsGuest()} disabled={guestBusy}
              className="min-h-12 rounded-xl border border-white/15 bg-white/[0.06] px-5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50">
              {guestBusy ? "Starting guest session…" : "Continue as Guest"}
            </button>
          </div>
          {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
          <p className="mt-8 text-xs text-zinc-500">Guest mode is limited to Siftah chat and its free Super Saiyan access. Other Looters features remain account-only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="siftah-app dark min-h-dvh" style={shellStyle}>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#09090b]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-[68px] w-full max-w-[1600px] items-center justify-between gap-3 px-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <SiftahWordmark compact />
              <span className="hidden h-7 w-px bg-white/10 sm:block" />
              <span className="hidden text-xs text-zinc-500 sm:block">AI workspace</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button type="button" onClick={() => setPaletteOpen((open) => !open)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-zinc-300 hover:bg-white/[0.08]"
                  aria-expanded={paletteOpen} aria-label="Change accent colour">
                  <span className="size-3 rounded-full" style={{ backgroundColor: palette.value }} />
                  <span className="hidden sm:inline">{palette.label}</span>
                  <ChevronDown className="size-3.5" />
                </button>
                {paletteOpen && <div className="absolute right-0 top-11 z-50 w-44 rounded-xl border border-white/10 bg-[#17171b] p-2 shadow-2xl">
                  {PALETTES.map((item) => <button key={item.id} type="button" onClick={() => { setPaletteId(item.id); setPaletteOpen(false); }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/[0.07]">
                    <span className="size-3 rounded-full" style={{ backgroundColor: item.value }} />{item.label}
                    {paletteId === item.id && <Check className="ml-auto size-4" />}
                  </button>)}
                </div>}
              </div>
              <span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-zinc-400 sm:inline-flex">
                {mode === "guest" ? "Guest mode" : "Looters account"}
              </span>
              <button type="button" onClick={() => setMobilePanelOpen(true)}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] md:hidden"
                aria-label="Open code files"><FileCode2 className="size-4" /></button>
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1600px] flex-1">
          <main className="flex min-w-0 flex-1 flex-col">
            <div className="border-b border-white/[0.06] px-3 py-2 sm:px-5">
              <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                {conversations.map((conversation) => (
                  <button key={conversation.id} type="button" onClick={() => { setActiveId(conversation.id); setError(null); }}
                    className={cn("max-w-52 shrink-0 rounded-lg px-3 py-2 text-xs transition",
                      conversation.id === activeId ? "bg-white/[0.09] text-white" : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300")}>
                    <span className="block truncate">{conversation.title}</span>
                  </button>
                ))}
                <button type="button" onClick={createConversation}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-medium text-zinc-300 hover:bg-white/[0.06]">
                  <Plus className="size-3.5" /> New chat
                </button>
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-3 sm:px-6">
              <div className="flex items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex size-8 items-center justify-center rounded-xl text-white" style={{ backgroundColor: palette.value }}><Sparkles className="size-4" /></span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">Siftah Mobile</p>
                    <p className="text-[11px] text-zinc-500">{lastRoute}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {mode === "account" && <span className="hidden text-xs tabular-nums text-zinc-500 sm:inline">{usage.creditsBalance} Credits</span>}
                  <button type="button" onClick={() => updateConversation([])} disabled={busy || !messages.length}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:bg-white/[0.06] disabled:opacity-30">Clear chat</button>
                  <button type="button" onClick={() => setPanelOpen((open) => !open)}
                    className="hidden size-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/[0.06] md:inline-flex"
                    aria-label={panelOpen ? "Minimise code panel" : "Maximise code panel"}>
                    {panelOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-5 pb-8">
                {messages.length === 0 && !busy && <WelcomePanel palette={palette.value} onPrompt={(prompt) => { setInput(prompt); textareaRef.current?.focus(); }} />}
                {messages.map((message) => (
                  <article key={message.id} className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}>
                    {message.role === "assistant" && <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: palette.value }}><Sparkles className="size-4" /></div>}
                    <div className={cn("max-w-[min(92%,760px)] rounded-2xl px-4 py-3 text-[14px] leading-7",
                      message.role === "user" ? "text-white" : "border border-white/[0.08] bg-[#151518] text-zinc-200")}
                      style={message.role === "user" ? { backgroundColor: palette.value } : undefined}>
                      <div className="whitespace-pre-wrap break-words">{message.content}</div>
                    </div>
                    {message.role === "user" && <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-xs font-semibold text-zinc-300">You</div>}
                  </article>
                ))}
                {busy && <div className="flex items-start gap-3">
                  <div className="flex size-8 items-center justify-center rounded-xl text-white" style={{ backgroundColor: palette.value }}><Sparkles className="size-4" /></div>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#151518] px-4 py-3 text-sm text-zinc-400"><Spinner /> Thinking…</div>
                </div>}
                <div ref={bottomRef} />
              </div>

              <div className="sticky bottom-0 -mx-3 border-t border-white/[0.06] bg-[#09090b]/95 px-3 pb-4 pt-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
                {error && <div className="mb-2 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>}
                {locked && <div className="mb-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-400">
                  Your free allowance refreshes in {cooldownLabel}. {mode === "account" ? "Buy Credits to continue now." : "Sign in to use purchased Credits."}
                </div>}
                <form onSubmit={(event) => { event.preventDefault(); void send(); }}
                  className="rounded-2xl border border-white/[0.12] bg-[#17171b] p-2 shadow-[0_8px_36px_rgba(0,0,0,.28)] focus-within:border-white/25">
                  <textarea ref={textareaRef} value={input} onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }}
                    rows={2} disabled={busy || locked} placeholder={locked ? "Your free allowance is cooling down…" : "Message Siftah…"}
                    className="max-h-40 min-h-[54px] w-full resize-y bg-transparent px-3 py-2 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-600 disabled:opacity-50" />
                  <div className="flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                      <span className="rounded-md border border-white/10 px-2 py-1">{usage.superSaiyanUsed < FREE_SUPER_SAIYAN ? "Super Saiyan" : "Siftah"}</span>
                      <span>{totalFreeLeft} free uses left</span>
                    </div>
                    <button type="submit" disabled={busy || locked || !input.trim()}
                      className="inline-flex size-9 items-center justify-center rounded-xl text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
                      style={{ backgroundColor: palette.value }} aria-label="Send message">
                      {busy ? <Spinner /> : <ArrowUp className="size-5" />}
                    </button>
                  </div>
                </form>
                <p className="mt-2 text-center text-[10px] text-zinc-600">AI can make mistakes. Check important information.</p>
              </div>
            </div>
          </main>

          <aside className={cn("hidden shrink-0 border-l border-white/[0.08] bg-[#101013] transition-[width] duration-200 md:flex md:flex-col",
            panelOpen ? "w-[min(34vw,390px)]" : "w-12")}>
            {panelOpen ? <>
              <div className="flex h-[61px] items-center justify-between border-b border-white/[0.07] px-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200"><FileCode2 className="size-4" /> Files</div>
                <button type="button" onClick={() => setPanelOpen(false)} className="rounded-md p-1.5 text-zinc-500 hover:bg-white/[0.06] hover:text-white" aria-label="Minimise files panel"><PanelRightClose className="size-4" /></button>
              </div>
              <ArtifactPanel artifacts={artifacts} active={activeArtifact} onSelect={setActiveArtifactId} onCopy={() => void copyArtifact()} onDownload={downloadArtifact} />
            </> : <button type="button" onClick={() => setPanelOpen(true)} className="flex h-12 items-center justify-center text-zinc-500 hover:text-white" aria-label="Open files panel"><PanelRightOpen className="size-4" /></button>}
          </aside>
        </div>

        {mobilePanelOpen && <div className="fixed inset-0 z-50 bg-black/60 md:hidden" onClick={() => setMobilePanelOpen(false)}>
          <aside className="absolute inset-y-0 right-0 flex w-[min(92vw,420px)] flex-col border-l border-white/10 bg-[#101013]" onClick={(event) => event.stopPropagation()}>
            <div className="flex h-[64px] items-center justify-between border-b border-white/[0.07] px-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200"><FileCode2 className="size-4" /> Files</div>
              <button type="button" onClick={() => setMobilePanelOpen(false)} className="rounded-md p-2 text-zinc-400 hover:bg-white/[0.06]" aria-label="Close files panel"><X className="size-4" /></button>
            </div>
            <ArtifactPanel artifacts={artifacts} active={activeArtifact} onSelect={setActiveArtifactId} onCopy={() => void copyArtifact()} onDownload={downloadArtifact} />
          </aside>
        </div>}
      </div>
    </div>
  );
}

function SiftahWordmark({ compact = false }: { compact?: boolean }) {
  return <div className={cn("select-none text-center", compact && "text-left")} aria-label="Siftah Mobile">
    <div className="siftah-wordmark">SIFTAH</div>
    <div className={cn("siftah-submark", compact && "siftah-submark-small")}>MOBILE</div>
  </div>;
}

function WelcomePanel({ palette, onPrompt }: { palette: string; onPrompt: (prompt: string) => void }) {
  const prompts = [
    { title: "Help me build something", prompt: "Help me plan and build a web app. Ask me what you need to know first." },
    { title: "Explain a tricky topic", prompt: "Explain a difficult topic clearly, step by step, with examples." },
    { title: "Write or improve code", prompt: "Help me write or improve some code. I'll describe what I'm trying to do." },
    { title: "Research an idea", prompt: "Help me research an idea and separate verified facts from assumptions." },
  ];
  return <div className="mx-auto flex max-w-2xl flex-col items-center px-3 pb-12 pt-12 text-center sm:pt-20">
    <div className="mb-6 flex size-14 items-center justify-center rounded-2xl text-white shadow-lg" style={{ backgroundColor: palette }}><Sparkles className="size-7" /></div>
    <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">What can I help with?</h1>
    <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-500">Choose a starting point or type your own question. Super Saiyan handles your first five free messages, then Siftah takes over.</p>
    <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
      {prompts.map((item) => <button key={item.title} type="button" onClick={() => onPrompt(item.prompt)}
        className="rounded-xl border border-white/[0.09] bg-white/[0.025] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.05]">
        <p className="text-sm font-semibold text-zinc-200">{item.title}</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{item.prompt}</p>
      </button>)}
    </div>
  </div>;
}

function ArtifactPanel({ artifacts, active, onSelect, onCopy, onDownload }: {
  artifacts: Artifact[]; active: Artifact | null; onSelect: (id: string) => void; onCopy: () => void; onDownload: () => void;
}) {
  if (!artifacts.length) return <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
    <FileCode2 className="size-8 text-zinc-700" />
    <p className="mt-3 text-sm font-medium text-zinc-400">Your files will appear here</p>
    <p className="mt-1 text-xs leading-5 text-zinc-600">When Siftah creates code, detected code files are collected in this panel so you can view, copy or download them.</p>
  </div>;
  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="flex flex-wrap gap-1 border-b border-white/[0.07] p-2">
      {artifacts.map((artifact) => <button key={artifact.id} type="button" onClick={() => onSelect(artifact.id)}
        className={cn("max-w-full truncate rounded-md px-2.5 py-1.5 text-[11px]", active?.id === artifact.id ? "bg-white/10 text-white" : "text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300")}>
        {artifact.name}
      </button>)}
    </div>
    {active && <>
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
        <div className="min-w-0"><p className="truncate text-xs font-medium text-zinc-300">{active.name}</p><p className="text-[10px] uppercase text-zinc-600">{active.language}</p></div>
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={onCopy} className="rounded-md p-2 text-zinc-500 hover:bg-white/[0.07] hover:text-white" aria-label="Copy code"><Copy className="size-3.5" /></button>
          <button type="button" onClick={onDownload} className="rounded-md p-2 text-zinc-500 hover:bg-white/[0.07] hover:text-white" aria-label="Download code file"><Download className="size-3.5" /></button>
        </div>
      </div>
      <pre className="min-h-0 flex-1 overflow-auto p-4 text-[11px] leading-5 text-zinc-300"><code>{active.code}</code></pre>
    </>}
  </div>;
}

function extractArtifacts(messages: Msg[]): Artifact[] {
  const files: Artifact[] = [];
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    const pattern = /```([^\n`]*)\n([\s\S]*?)```/g;
    let match: RegExpExecArray | null;
    let index = 0;
    while ((match = pattern.exec(message.content)) !== null) {
      const info = match[1].trim();
      const language = info.split(/\s+/)[0] || "text";
      const explicit = info.match(/(?:file|filename)=([^\s]+)/i)?.[1];
      const pathLike = info.split(/\s+/).find((part) => /\.[a-z0-9]{1,8}$/i.test(part) || part.includes("/"));
      const extension = languageExtensions[language.toLowerCase()] || "txt";
      const name = explicit || pathLike || `snippet-${files.length + 1}.${extension}`;
      files.push({ id: `${message.id}-${index++}`, name: name.split("/").pop() || name, language, code: match[2].replace(/\n$/, "") });
    }
  }
  return files;
}

const languageExtensions: Record<string, string> = {
  ts: "ts", tsx: "tsx", js: "js", jsx: "jsx", html: "html", css: "css",
  json: "json", py: "py", python: "py", sql: "sql", bash: "sh", sh: "sh",
  md: "md", yaml: "yml", yml: "yml", xml: "xml", rust: "rs", go: "go",
};

function formatDuration(milliseconds: number) {
  const total = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(total / 3600)}h ${String(Math.floor((total % 3600) / 60)).padStart(2, "0")}m ${String(total % 60).padStart(2, "0")}s`;
}

function Spinner() {
  return <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-label="Loading" />;
}
