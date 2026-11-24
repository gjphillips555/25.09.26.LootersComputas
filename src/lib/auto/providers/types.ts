import type { AutoFilters, AutoListing } from "../shared";

/**
 * A source of vehicle listings that can be merged into the Siftah Auto grid.
 * Only official APIs / licensed feeds may be implemented here (no scraping).
 * Each provider is switched off unless its credentials are configured in env.
 */
export interface AutoProvider {
  id: string;
  label: string;
  /** True only when credentials are configured and the provider is allowed to run. */
  enabled(): boolean;
  /** Human-readable reason the provider is off (shown to admins / in /api/auto?op=providers). */
  status(): string;
  search(filters: AutoFilters, signal: AbortSignal): Promise<{ items: AutoListing[]; total?: number }>;
}
