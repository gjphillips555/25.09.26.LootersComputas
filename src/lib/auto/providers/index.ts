import type { AutoFilters, AutoListing } from "../shared";
import type { AutoProvider } from "./types";
import { trademeProvider } from "./trademe";

/** Registered external providers. Add official/licensed feeds here; each is env-gated. */
export const PROVIDERS: AutoProvider[] = [trademeProvider];

export function providerStatus() {
  return PROVIDERS.map((p) => ({ id: p.id, label: p.label, enabled: p.enabled(), status: p.status() }));
}

/** Query every enabled provider in parallel (3.5 s budget each); failures are reported, not thrown. */
export async function searchProviders(filters: AutoFilters) {
  const active = PROVIDERS.filter((p) => p.enabled());
  const results = await Promise.all(
    active.map(async (p) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3500);
      try {
        const r = await p.search(filters, ctrl.signal);
        return { id: p.id, label: p.label, ok: true as const, items: r.items, total: r.total ?? r.items.length };
      } catch (err) {
        console.error(`[auto] provider ${p.id} failed`, err);
        return { id: p.id, label: p.label, ok: false as const, items: [] as AutoListing[], total: 0 };
      } finally {
        clearTimeout(timer);
      }
    }),
  );
  return results;
}
