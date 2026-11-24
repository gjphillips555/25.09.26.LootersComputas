import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BellRing, CalendarPlus, ExternalLink, Info, Loader2, Play, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { autoApi } from "@/components/auto/auto-ui";
import { signInHref } from "@/components/siftah/site-chat-panes";
import {
  NZTA_EXPIRY_URL, REMINDER_OPTIONS, buildRegoIcs, carjamPublicUrl, expiryError, isoDate, normalizePlate, parseIsoDate, plateError,
  type RegoVehicle,
} from "@/lib/auto/rego";

const TITLE = "Rego Checker · Siftah Auto | Siftah Solutions";
const DESC = "Type an NZ plate to see the vehicle's make, model, year, colour and body, check rego expiry on the official NZTA site, and set calendar reminders.";

export const Route = createFileRoute("/auto/rego")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: "Siftah Rego Checker" },
      { property: "og:description", content: DESC },
      { property: "og:url", content: "https://www.looterscomputas.online/auto/rego" },
    ],
    links: [{ rel: "canonical", href: "https://www.looterscomputas.online/auto/rego" }],
  }),
  component: RegoChecker,
});

type Lookup = {
  plate: string;
  enabled: boolean;
  carjamUrl: string;
  found?: boolean;
  vehicle?: RegoVehicle | null;
  cached?: boolean;
  fetchedAt?: string;
  error?: string;
};
type Reminder = { id: string; plate: string; label: string | null; expiry: string };

const fmtLong = (iso: string) =>
  parseIsoDate(iso)?.toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" }) ?? iso;
const daysUntil = (iso: string) => {
  const d = parseIsoDate(iso);
  if (!d) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
};

function downloadIcs(plate: string, expiry: string, days: number[], label?: string) {
  const blob = new Blob([buildRegoIcs(plate, expiry, days, label)], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `rego-reminder-${plate}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function RegoChecker() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<Lookup | null>(null);
  const [expiry, setExpiry] = useState("");
  const [label, setLabel] = useState("");
  const [days, setDays] = useState<number[]>([14, 1]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const loadReminders = async () => {
    const { ok, status, data } = await autoApi<{ items: Reminder[] }>("/api/auto/rego-check?op=reminders");
    setSignedIn(status !== 401);
    if (ok) setReminders(data.items);
  };
  useEffect(() => {
    void loadReminders();
    const p = new URLSearchParams(window.location.search).get("plate");
    if (p) setInput(normalizePlate(p).slice(0, 6));
  }, []);

  const start = async (e: FormEvent) => {
    e.preventDefault();
    const plate = normalizePlate(input);
    const err = plateError(plate);
    setError(err);
    if (err) return;
    setBusy(true);
    setExpiry("");
    const { ok, data } = await autoApi<Lookup>("/api/auto/rego-check", { body: { action: "lookup", plate } });
    setBusy(false);
    if (!ok) {
      setRes({ plate, enabled: true, carjamUrl: (data as Lookup).carjamUrl || carjamPublicUrl(plate), error: data.error || "Lookup failed." });
      return;
    }
    setRes(data);
    const saved = reminders.find((r) => r.plate === plate);
    if (saved) {
      setExpiry(saved.expiry);
      setLabel(saved.label || "");
    }
  };

  const expiryErr = expiry ? expiryError(expiry) : null;
  const validExpiry = expiry && !expiryErr ? expiry : "";

  const save = async () => {
    if (!res || !validExpiry) return;
    const { ok, data } = await autoApi("/api/auto/rego-check", { body: { action: "save_reminder", plate: res.plate, expiry: validExpiry, label } });
    if (!ok) return toast.error(data.error || "Couldn't save");
    toast.success(`Saved reminder for ${res.plate}`);
    void loadReminders();
  };
  const remove = async (id: string) => {
    const { ok } = await autoApi("/api/auto/rego-check", { body: { action: "delete_reminder", id } });
    if (ok) setReminders((r) => r.filter((x) => x.id !== id));
  };

  return (
    <AppShell>
      <section className="siftah-hero relative -mx-4 overflow-hidden px-4 py-8 text-white sm:mx-0 sm:mt-4 sm:rounded-[2rem] sm:px-8">
        <Link to={"/auto" as "/"} className="inline-flex items-center gap-1 text-sm font-bold text-[#5cc8f2] hover:underline"><ArrowLeft className="size-4" /> Siftah Auto</Link>
        <h1 className="mt-3 font-display text-4xl leading-[0.95] sm:text-5xl">
          Rego Checker. <span className="text-[#e3121b]">Know your ride.</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm text-white/70">Type an NZ plate and press Start for the vehicle basics, then check the rego expiry on the official NZTA site and set yourself a reminder.</p>
        <form onSubmit={start} className="mt-5 flex max-w-xl gap-2 rounded-full bg-white p-1.5" data-testid="rego-form">
          <Search className="ml-3 size-5 shrink-0 self-center text-[#55555c]" />
          <input
            value={input}
            onChange={(e) => { setInput(e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 8)); setError(null); }}
            placeholder="Plate, e.g. ABC123"
            aria-label="NZ plate"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent font-mono text-lg font-bold tracking-[0.2em] text-[#0b0b0c] outline-none placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal"
            data-testid="rego-input"
          />
          <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-[#e3121b] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#ff2a33] disabled:opacity-60" data-testid="rego-start">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Start
          </button>
        </form>
        {error && <p className="mt-2 text-sm font-bold text-[#ff8a8f]" data-testid="rego-error">{error}</p>}
      </section>

      {res && (
        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <ResultCard res={res} expiry={validExpiry} />
            <VehicleNote res={res} />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-[#0b0b0c] bg-white p-4 text-[#0b0b0c]">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#e3121b]">Step 1 · Rego expiry</p>
              <p className="mt-1 text-sm text-[#55555c]">Expiry dates come only from the official NZTA site. We don't look them up for you.</p>
              <a href={NZTA_EXPIRY_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0b0b0c] px-5 py-3 text-sm font-bold text-white hover:bg-[#2a2a2e]" data-testid="nzta-link">
                Check expiry on the official NZTA site <ExternalLink className="size-4" />
              </a>
            </div>

            <div className="rounded-2xl border-2 border-[#0b0b0c] bg-white p-4 text-[#0b0b0c]">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#e3121b]">Step 2 · Remind me</p>
              <label className="mt-2 block text-xs font-bold text-[#55555c]">
                Expiry date shown on NZTA
                <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} min={isoDate(new Date(Date.now() - 60 * 86400000))} className="mt-1 h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-sm text-[#0b0b0c]" data-testid="expiry-input" />
              </label>
              {expiryErr && <p className="mt-1 text-xs font-bold text-[#e3121b]">{expiryErr}</p>}
              <label className="mt-2 block text-xs font-bold text-[#55555c]">
                Nickname (optional)
                <input value={label} onChange={(e) => setLabel(e.target.value.slice(0, 40))} placeholder="e.g. Work ute" className="mt-1 h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-sm text-[#0b0b0c]" />
              </label>
              <fieldset className="mt-3">
                <legend className="text-xs font-bold text-[#55555c]">Remind me</legend>
                <div className="mt-1 flex flex-wrap gap-2">
                  {REMINDER_OPTIONS.map((o) => {
                    const on = days.includes(o.days);
                    return (
                      <button key={o.days} type="button" aria-pressed={on} onClick={() => setDays((d) => (on ? d.filter((x) => x !== o.days) : [...d, o.days]))} className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold ${on ? "border-[#e3121b] bg-[#e3121b] text-white" : "border-black/15 text-[#0b0b0c]"}`}>
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={!validExpiry || days.length === 0} onClick={() => downloadIcs(res.plate, validExpiry, days, label.trim() || undefined)} className="inline-flex items-center gap-1.5 rounded-full bg-[#e3121b] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#ff2a33] disabled:opacity-40" data-testid="ics-download">
                  <CalendarPlus className="size-4" /> Add to calendar (.ics)
                </button>
                {signedIn ? (
                  <button type="button" disabled={!validExpiry} onClick={save} className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#0b0b0c] px-4 py-2 text-sm font-bold disabled:opacity-40" data-testid="save-reminder">
                    <BellRing className="size-4" /> Save to my reminders
                  </button>
                ) : signedIn === false ? (
                  <a href={signInHref()} className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#0b0b0c] px-4 py-2 text-sm font-bold">
                    <BellRing className="size-4" /> Sign in to save reminders
                  </a>
                ) : null}
              </div>
              <p className="mt-2 text-[11px] text-[#55555c]">The calendar file adds an all-day event with a 9 am alert for each option you pick. Saved reminders are a list on this page; we don't email or text you.</p>
            </div>
          </div>
        </section>
      )}

      {signedIn && reminders.length > 0 && (
        <section className="mt-8" data-testid="reminder-list">
          <h2 className="font-display text-2xl">My rego reminders</h2>
          <ul className="mt-3 divide-y divide-black/10 rounded-2xl border-2 border-[#0b0b0c] bg-white text-[#0b0b0c]">
            {reminders.map((r) => {
              const d = daysUntil(r.expiry);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 p-3">
                  <span className="rounded-lg border-2 border-[#0b0b0c] px-2 py-0.5 font-mono text-sm font-black tracking-widest">{r.plate}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{r.label || "Rego expiry"} · {fmtLong(r.expiry)}</p>
                    <p className={`text-xs ${d !== null && d <= 14 ? "font-bold text-[#e3121b]" : "text-[#55555c]"}`}>
                      {d === null ? "" : d < 0 ? `Expired ${-d} day${d === -1 ? "" : "s"} ago` : d === 0 ? "Expires today" : `${d} day${d === 1 ? "" : "s"} to go`}
                    </p>
                  </div>
                  <button type="button" onClick={() => downloadIcs(r.plate, r.expiry, days.length ? days : [14, 1], r.label || undefined)} className="inline-flex items-center gap-1 rounded-full border border-black/15 px-3 py-1.5 text-xs font-bold"><CalendarPlus className="size-3.5" /> .ics</button>
                  <button type="button" onClick={() => void remove(r.id)} aria-label={`Delete reminder for ${r.plate}`} className="rounded-full border border-black/15 p-2"><Trash2 className="size-3.5" /></button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="mt-8 flex gap-2 rounded-2xl bg-black/5 p-4 text-xs text-[#55555c]">
        <Info className="size-4 shrink-0" />
        Siftah Rego Checker is an information tool by Siftah Solutions. It isn't a vehicle licence, isn't affiliated with or endorsed by NZ Transport Agency Waka Kotahi, and doesn't check or prove registration status. Vehicle details come from CarJam's official API when available; expiry dates are only what you enter from the official NZTA site.
      </p>
    </AppShell>
  );
}

/** On-screen results card: Siftah-branded, plain white, not label-sized, hidden when printing. */
function ResultCard({ res, expiry }: { res: Lookup; expiry: string }) {
  const v = res.found ? res.vehicle : null;
  const ymm = v ? [v.year, v.make, v.model].filter(Boolean).join(" ") : "";
  const extra = v ? [v.colour, v.body].filter(Boolean).join(" · ") : "";
  const d = expiry ? daysUntil(expiry) : null;
  return (
    <article className="w-full overflow-hidden rounded-3xl border-2 border-[#0b0b0c] bg-white text-[#0b0b0c] shadow-[0_6px_0_#0b0b0c] print:hidden" data-testid="rego-result" aria-label="Siftah Rego Checker result">
      <header className="flex items-center justify-between gap-2 border-b-2 border-[#0b0b0c] bg-[#0b0b0c] px-4 py-2 text-white">
        <span className="text-[11px] font-black uppercase tracking-[0.2em]">Siftah Rego Checker</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Not a licence</span>
      </header>
      <div className="p-5 sm:p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#55555c]">Rego expiry</p>
        {expiry ? (
          <div data-testid="result-expiry">
            <p className="font-display text-4xl leading-none sm:text-5xl">{fmtLong(expiry)}</p>
            <p className={`mt-1 text-xs font-bold ${d !== null && d <= 14 ? "text-[#e3121b]" : "text-[#55555c]"}`}>
              {d === null ? "" : d < 0 ? `Expired ${-d} days ago` : d === 0 ? "Expires today" : `${d} days to go`} · as entered by you
            </p>
          </div>
        ) : (
          <a href={NZTA_EXPIRY_URL} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-2 font-display text-3xl leading-none text-[#1f9fd6] hover:underline sm:text-4xl" data-testid="result-expiry-placeholder">
            Check on NZTA <ExternalLink className="size-6" />
          </a>
        )}

        <div className="mt-6 min-h-[4.5rem]" data-testid="result-vehicle">
          {v ? (
            <>
              <p className="text-2xl font-black uppercase leading-tight sm:text-3xl">{ymm || v.make}</p>
              {extra && <p className="mt-1 text-sm font-bold uppercase tracking-wide text-[#55555c]">{extra}</p>}
            </>
          ) : res.error ? (
            <p className="text-sm font-bold text-[#e3121b]">{res.error}</p>
          ) : !res.enabled ? (
            <p className="text-lg font-black uppercase leading-tight text-[#55555c]">Vehicle lookup coming soon</p>
          ) : (
            <p className="text-lg font-black uppercase leading-tight text-[#55555c]">No vehicle found for this plate</p>
          )}
        </div>

        <div className="mt-6 flex items-end justify-between gap-3">
          <p className="font-mono text-5xl font-black leading-none tracking-[0.12em] sm:text-6xl" data-testid="result-plate">{res.plate}</p>
          <span className="shrink-0 rounded-full bg-[#e3121b] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">Siftah</span>
        </div>
      </div>
    </article>
  );
}

function VehicleNote({ res }: { res: Lookup }) {
  if (res.found && res.vehicle) {
    return (
      <p className="mt-3 text-xs text-[#55555c]" data-testid="vehicle-source">
        Vehicle details from CarJam{res.fetchedAt ? `, checked ${new Date(res.fetchedAt).toLocaleDateString("en-NZ")}` : ""}.{" "}
        <a href={res.carjamUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-[#1f9fd6] hover:underline">Full report on CarJam</a>
      </p>
    );
  }
  return (
    <div className="mt-3 rounded-2xl border border-black/10 bg-white p-4 text-sm text-[#0b0b0c]" data-testid="vehicle-fallback">
      <p className="font-bold">{!res.enabled ? "Vehicle lookup is coming soon." : res.error ? "We couldn't get the vehicle details right now." : "We couldn't find vehicle details for that plate."}</p>
      <p className="mt-1 text-[#55555c]">You can still see the plate's public page on CarJam.</p>
      <a href={res.carjamUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#0b0b0c] px-4 py-2 text-sm font-bold text-white" data-testid="carjam-link">
        Open {res.plate} on CarJam <ExternalLink className="size-4" />
      </a>
    </div>
  );
}
