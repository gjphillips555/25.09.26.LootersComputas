import type { AutoProvider } from "./types";
import type { AutoListing } from "../shared";

/**
 * Trade Me Motors provider (STUB, off by default).
 *
 * Turns on only when TRADEME_CONSUMER_KEY and TRADEME_CONSUMER_SECRET are set AND
 * TRADEME_PROVIDER_ENABLED=true. Trade Me's API terms (developer.trademe.co.nz/terms-and-conditions,
 * rule 32 + Business Rules "Data Combining") forbid combining Trade Me data with listings from other
 * sites without Trade Me's written consent, so only enable this once Trade Me has approved this
 * exact use. Motors API access is for dealers / vehicle-management integrators (motorsapi@trademe.co.nz).
 */
const BASE = process.env.TRADEME_API_BASE?.trim() || "https://api.trademe.co.nz/v1";

function oauthHeader(key: string, secret: string) {
  // OAuth 1.0a PLAINTEXT, application-only (no user token) as documented for Trade Me public searches.
  const nonce = Math.random().toString(36).slice(2);
  const ts = Math.floor(Date.now() / 1000);
  return `OAuth oauth_consumer_key="${encodeURIComponent(key)}", oauth_signature_method="PLAINTEXT", oauth_timestamp="${ts}", oauth_nonce="${nonce}", oauth_version="1.0", oauth_signature="${encodeURIComponent(secret)}%26"`;
}

type TmItem = {
  ListingId: number; Title?: string; Make?: string; Model?: string; Year?: number; Odometer?: number;
  PriceDisplay?: string; StartPrice?: number; BuyNowPrice?: number; Region?: string; Suburb?: string;
  BodyStyle?: string; Fuel?: string; Transmission?: string; PictureHref?: string; StartDate?: string;
};

export const trademeProvider: AutoProvider = {
  id: "trademe",
  label: "Trade Me Motors",
  enabled() {
    return Boolean(
      process.env.TRADEME_CONSUMER_KEY?.trim() &&
        process.env.TRADEME_CONSUMER_SECRET?.trim() &&
        process.env.TRADEME_PROVIDER_ENABLED === "true",
    );
  },
  status() {
    if (!process.env.TRADEME_CONSUMER_KEY || !process.env.TRADEME_CONSUMER_SECRET) return "Off: no Trade Me API keys configured.";
    if (process.env.TRADEME_PROVIDER_ENABLED !== "true") return "Off: keys present but TRADEME_PROVIDER_ENABLED is not 'true'.";
    return "On";
  },
  async search(f, signal) {
    const key = process.env.TRADEME_CONSUMER_KEY!.trim();
    const secret = process.env.TRADEME_CONSUMER_SECRET!.trim();
    const qs = new URLSearchParams({ rows: "24", page: String(f.page || 1) });
    if (f.q) qs.set("search_string", f.q);
    if (f.make) qs.set("make", f.make);
    if (f.model) qs.set("model", f.model);
    if (f.yearMin) qs.set("year_min", String(f.yearMin));
    if (f.yearMax) qs.set("year_max", String(f.yearMax));
    if (f.priceMin) qs.set("price_min", String(f.priceMin));
    if (f.priceMax) qs.set("price_max", String(f.priceMax));
    if (f.odoMax) qs.set("odometer_max", String(f.odoMax));
    const res = await fetch(`${BASE}/Search/Motors/Used.json?${qs}`, {
      headers: { Authorization: oauthHeader(key, secret) },
      signal,
    });
    if (!res.ok) throw new Error(`Trade Me ${res.status}`);
    const data = (await res.json()) as { List?: TmItem[]; TotalCount?: number };
    const items: AutoListing[] = (data.List || []).map((it) => ({
      id: `trademe-${it.ListingId}`,
      source: "trademe",
      externalUrl: `https://www.trademe.co.nz/a/motors/cars/listing/${it.ListingId}`,
      title: it.Title || [it.Year, it.Make, it.Model].filter(Boolean).join(" "),
      make: it.Make || "",
      model: it.Model || "",
      year: it.Year || 0,
      price: it.BuyNowPrice || it.StartPrice || 0,
      odometer: it.Odometer ?? null,
      region: it.Region || "",
      location: it.Suburb || null,
      bodyType: it.BodyStyle || null,
      fuel: it.Fuel || null,
      transmission: it.Transmission || null,
      rego: null,
      description: "",
      photos: it.PictureHref ? [it.PictureHref] : [],
      status: "active",
      createdAt: it.StartDate || new Date().toISOString(),
      updatedAt: it.StartDate || new Date().toISOString(),
      seller: null,
    }));
    return { items, total: data.TotalCount };
  },
};
