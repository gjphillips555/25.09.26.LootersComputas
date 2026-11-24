import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CarFront, Loader2, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ListingCard, SearchEverywhere, autoApi } from "@/components/auto/auto-ui";
import {
  BODY_TYPES, FUELS, NZ_REGIONS, POPULAR_MAKES, SORTS, TRANSMISSIONS, type AutoListing,
} from "@/lib/auto/shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auto/")({
  head: () => ({
    meta: [
      { title: "Siftah Auto · NZ cars for sale | Siftah Solutions" },
      { name: "description", content: "Browse and list cars for sale in New Zealand on Siftah Auto, and search Trade Me, Turners, AutoTrader and more in one place." },
    ],
  }),
  component: AutoBrowse,
});

const FIELDS = ["q", "make", "model", "yearMin", "yearMax", "priceMin", "priceMax", "odoMax", "region", "body", "fuel", "trans", "sort", "page"] as const;
type Field = (typeof FIELDS)[number];
type Filters = Partial<Record<Field, string>>;

function readUrl(): Filters {
  if (typeof window === "undefined") return {};
  const sp = new URLSearchParams(window.location.search);
  const f: Filters = {};
  for (const k of FIELDS) {
    const v = sp.get(k);
    if (v) f[k] = v;
  }
  return f;
}

type External = { id: string; label: string; ok: boolean; items: AutoListing[]; total: number };

function AutoBrowse() {
  const [filters, setFilters] = useState<Filters>({});
  const [draft, setDraft] = useState<Filters>({});
  const [items, setItems] = useState<AutoListing[]>([]);
  const [external, setExternal] = useState<External[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(24);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const f = readUrl();
    setFilters(f);
    setDraft(f);
    const onPop = () => {
      const g = readUrl();
      setFilters(g);
      setDraft(g);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    for (const k of FIELDS) if (filters[k]) sp.set(k, filters[k]!);
    return sp.toString();
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await autoApi<{ items: AutoListing[]; total: number; pageSize: number; external: External[] }>(
      `/api/auto/listings?op=search&${query}`,
    );
    if (ok) {
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPageSize(data.pageSize || 24);
      setExternal((data.external || []).filter((e) => e.ok && e.items.length));
    }
    setLoading(false);
  }, [query]);
  useEffect(() => {
    void load();
  }, [load]);

  const apply = (next: Filters, push = true) => {
    const clean: Filters = {};
    for (const k of FIELDS) if (next[k]) clean[k] = next[k];
    setFilters(clean);
    setDraft(clean);
    const sp = new URLSearchParams(clean as Record<string, string>).toString();
    const url = `/auto${sp ? `?${sp}` : ""}`;
    if (push) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  };
  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    apply({ ...draft, page: undefined });
    setShowFilters(false);
  };
  const set = (k: Field, v: string) => setDraft((d) => ({ ...d, [k]: v || undefined }));
  const activeCount = FIELDS.filter((k) => !["q", "sort", "page"].includes(k) && filters[k]).length;
  const page = Number(filters.page || 1);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const thisYear = new Date().getFullYear();

  const select = (k: Field, label: string, options: readonly string[]) => (
    <label className="block text-xs font-bold text-[#55555c]">
      {label}
      <select value={draft[k] || ""} onChange={(e) => set(k, e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-black/15 bg-white px-3 text-sm font-medium text-[#0b0b0c]">
        <option value="">Any</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
  const num = (k: Field, label: string, placeholder: string) => (
    <label className="block text-xs font-bold text-[#55555c]">
      {label}
      <input inputMode="numeric" value={draft[k] || ""} onChange={(e) => set(k, e.target.value.replace(/[^0-9]/g, ""))} placeholder={placeholder} className="mt-1 h-10 w-full rounded-xl border border-black/15 bg-white px-3 text-sm text-[#0b0b0c]" />
    </label>
  );

  const filterPanel = (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-xs font-bold text-[#55555c]">
        Make
        <input list="auto-makes" value={draft.make || ""} onChange={(e) => set("make", e.target.value)} placeholder="Any make" className="mt-1 h-10 w-full rounded-xl border border-black/15 bg-white px-3 text-sm text-[#0b0b0c]" />
        <datalist id="auto-makes">{POPULAR_MAKES.map((m) => <option key={m} value={m} />)}</datalist>
      </label>
      <label className="block text-xs font-bold text-[#55555c]">
        Model
        <input value={draft.model || ""} onChange={(e) => set("model", e.target.value)} placeholder="Any model" className="mt-1 h-10 w-full rounded-xl border border-black/15 bg-white px-3 text-sm text-[#0b0b0c]" />
      </label>
      <div className="grid grid-cols-2 gap-2">{num("yearMin", "Year from", "1990")}{num("yearMax", "Year to", String(thisYear))}</div>
      <div className="grid grid-cols-2 gap-2">{num("priceMin", "Price from $", "0")}{num("priceMax", "Price to $", "Any")}</div>
      {num("odoMax", "Max kilometres", "e.g. 150000")}
      {select("region", "Region", NZ_REGIONS)}
      {select("body", "Body type", BODY_TYPES)}
      {select("fuel", "Fuel", FUELS)}
      {select("trans", "Transmission", TRANSMISSIONS)}
      <div className="flex gap-2 pt-1">
        <button type="submit" className="h-10 flex-1 rounded-full bg-[#e3121b] text-sm font-bold text-white hover:bg-[#ff2a33]">Show results</button>
        <button type="button" onClick={() => apply({ q: filters.q, sort: filters.sort })} className="h-10 rounded-full border border-black/15 px-4 text-sm font-bold">Clear</button>
      </div>
    </form>
  );

  return (
    <AppShell>
      <section className="siftah-hero relative -mx-4 overflow-hidden px-4 py-8 text-white sm:mx-0 sm:mt-4 sm:rounded-[2rem] sm:px-8">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#5cc8f2]">
          <CarFront className="size-3.5" /> Siftah Auto · NZ
        </p>
        <h1 className="mt-3 font-display text-4xl leading-[0.95] sm:text-5xl">
          Find your next ride. <span className="text-[#e3121b]">List yours free.</span>
        </h1>
        <form onSubmit={submit} className="mt-5 flex max-w-2xl gap-2 rounded-full bg-white p-1.5">
          <Search className="ml-3 size-5 shrink-0 self-center text-[#55555c]" />
          <input
            value={draft.q || ""}
            onChange={(e) => set("q", e.target.value)}
            placeholder="Search make, model or keyword (e.g. Hilux, Aqua, Ranger)"
            className="min-w-0 flex-1 bg-transparent text-sm text-[#0b0b0c] outline-none"
            aria-label="Search cars"
          />
          <button type="submit" className="rounded-full bg-[#e3121b] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#ff2a33]">Search</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to={"/auto/sell" as "/"} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#0b0b0c] hover:bg-[#5cc8f2]">
            <Plus className="size-4" /> List a vehicle
          </Link>
          <Link to={"/auto/sell" as "/"} hash="mine" className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-4 py-2 text-sm font-bold hover:bg-white/10">
            My listings
          </Link>
        </div>
      </section>

      <SearchEverywhere className="mt-4" q={filters.q} make={filters.make} model={filters.model} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border-2 border-[#0b0b0c] bg-[#f4f4f5] p-4">
            <p className="mb-3 font-display text-lg">Filters</p>
            {filterPanel}
          </div>
        </aside>

        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="mr-auto text-sm text-muted-foreground" data-testid="auto-count">
              {loading ? "Loading…" : `${total.toLocaleString("en-NZ")} Siftah listing${total === 1 ? "" : "s"}`}
            </p>
            <button type="button" onClick={() => setShowFilters(true)} className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#0b0b0c] px-3 py-1.5 text-xs font-bold lg:hidden">
              <SlidersHorizontal className="size-3.5" /> Filters{activeCount ? ` (${activeCount})` : ""}
            </button>
            <select
              value={filters.sort || "newest"}
              onChange={(e) => apply({ ...filters, sort: e.target.value === "newest" ? undefined : e.target.value, page: undefined })}
              className="h-9 rounded-full border-2 border-[#0b0b0c] bg-white px-3 text-xs font-bold text-[#0b0b0c]"
              aria-label="Sort"
            >
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-[#e3121b]" /></div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-[#0b0b0c]/30 px-6 py-14 text-center" data-testid="auto-empty">
              <CarFront className="mx-auto size-12 text-[#e3121b]" />
              <p className="mt-3 font-display text-2xl">
                {query && query !== "sort=newest" ? "No Siftah listings match yet" : "Be the first to list on Siftah Auto"}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Siftah Auto shows real vehicles listed by members — no copied or demo ads. List yours free in a couple of minutes, or use “Search everywhere” above to check other NZ sites.
              </p>
              <Link to={"/auto/sell" as "/"} className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#e3121b] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#ff2a33]">
                <Plus className="size-4" /> List a vehicle
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="auto-grid">
              {items.map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}

          {pages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button type="button" disabled={page <= 1} onClick={() => apply({ ...filters, page: String(page - 1) })} className="rounded-full border-2 border-[#0b0b0c] px-4 py-1.5 text-sm font-bold disabled:opacity-30">Prev</button>
              <span className="text-sm">Page {page} of {pages}</span>
              <button type="button" disabled={page >= pages} onClick={() => apply({ ...filters, page: String(page + 1) })} className="rounded-full border-2 border-[#0b0b0c] px-4 py-1.5 text-sm font-bold disabled:opacity-30">Next</button>
            </div>
          )}

          {external.map((ext) => (
            <section key={ext.id} className="mt-8">
              <p className="mb-3 font-display text-xl">From {ext.label} <span className="text-sm font-normal text-muted-foreground">({ext.total.toLocaleString("en-NZ")} via official API)</span></p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {ext.items.map((l) => <ListingCard key={l.id} listing={l} />)}
              </div>
            </section>
          ))}
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-white lg:hidden" role="dialog" aria-label="Filters">
          <div className="flex items-center justify-between bg-[#0b0b0c] px-4 py-3 text-white">
            <p className="font-display text-lg">Filters</p>
            <button type="button" onClick={() => setShowFilters(false)} aria-label="Close filters" className="rounded-full p-1.5 hover:bg-white/10"><X className="size-5" /></button>
          </div>
          <div className={cn("flex-1 overflow-y-auto p-4")}>{filterPanel}</div>
        </div>
      )}
    </AppShell>
  );
}
