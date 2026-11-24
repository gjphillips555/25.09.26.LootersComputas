/** Shared Siftah Auto constants (client + server). */
export const NZ_REGIONS = [
  "Northland", "Auckland", "Waikato", "Bay of Plenty", "Gisborne", "Hawke's Bay", "Taranaki",
  "Manawatū-Whanganui", "Wellington", "Tasman", "Nelson", "Marlborough", "West Coast", "Canterbury",
  "Otago", "Southland",
] as const;
export const BODY_TYPES = ["Hatchback", "Sedan", "Station Wagon", "SUV", "Ute", "Van", "Coupe", "Convertible", "People Mover", "Truck", "Motorbike", "Other"] as const;
export const FUELS = ["Petrol", "Diesel", "Hybrid", "Plug-in Hybrid", "Electric", "LPG", "Other"] as const;
export const TRANSMISSIONS = ["Automatic", "Manual", "Tiptronic", "CVT", "Other"] as const;
export const POPULAR_MAKES = [
  "Toyota", "Mazda", "Nissan", "Ford", "Holden", "Mitsubishi", "Honda", "Subaru", "Suzuki", "Hyundai", "Kia",
  "Volkswagen", "BMW", "Mercedes-Benz", "Audi", "Tesla", "BYD", "MG", "Isuzu", "Lexus", "Jeep", "Land Rover",
  "Porsche", "Volvo", "Skoda", "Peugeot", "Daihatsu", "Chevrolet", "Great Wall", "LDV",
] as const;
export const SORTS = {
  newest: "Newest listed",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  year_desc: "Year: newest first",
  odo_asc: "Kilometres: lowest first",
} as const;
export type SortKey = keyof typeof SORTS;
export const MAX_PHOTOS = 10;

export type AutoFilters = {
  q?: string;
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  odoMax?: number;
  region?: string;
  body?: string;
  fuel?: string;
  trans?: string;
  sort?: SortKey;
  page?: number;
};

export type AutoSeller = { id: string; name: string; image: string | null };
export type AutoListing = {
  id: string;
  source: "siftah" | string;
  externalUrl?: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  odometer: number | null;
  region: string;
  location: string | null;
  bodyType: string | null;
  fuel: string | null;
  transmission: string | null;
  rego: string | null;
  description: string;
  photos: string[];
  status: "active" | "sold" | "removed";
  createdAt: string;
  updatedAt: string;
  seller: AutoSeller | null;
  /** Live chat section on the listing page (messages delete after 2 hours). */
  contactChat?: boolean;
  /** Seller listed a mobile number (revealed on tap via the API, never in page HTML). */
  hasPhone?: boolean;
  /** Only included for the listing's owner (edit form). */
  contactPhone?: string | null;
};

/** Normalise an NZ mobile (021/022/027/029/020/028…, or +64 2x…) to 02XXXXXXXX; null when invalid. */
export function normalizeNzMobile(input: string): string | null {
  let d = String(input || "").trim().replace(/[\s().-]/g, "");
  if (d.startsWith("+64")) d = "0" + d.slice(3);
  else if (d.startsWith("0064")) d = "0" + d.slice(4);
  else if (/^642\d/.test(d)) d = "0" + d.slice(2);
  return /^02\d{7,9}$/.test(d) ? d : null;
}

/** 0211234567 → "021 123 4567". */
export function formatNzMobile(d: string): string {
  const rest = d.slice(3);
  return `${d.slice(0, 3)} ${rest.slice(0, 3)} ${rest.slice(3)}`.trim();
}

export const LISTING_CHAT_TTL_HOURS = 2;

export function nzd(n: number) {
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(n);
}
export function km(n: number | null) {
  return n == null ? "—" : `${new Intl.NumberFormat("en-NZ").format(n)} km`;
}

/**
 * "Search everywhere" deep links: open the same search on other NZ car sites using their public
 * search URLs. We link out only; no data from these sites is fetched or shown here.
 */
export function searchEverywhereLinks(f: { q?: string; make?: string; model?: string; rego?: string }) {
  const words = [f.make, f.model, f.q].filter(Boolean).join(" ").trim();
  const enc = encodeURIComponent(words);
  const slug = (s?: string) => (s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const makeModelPath = f.make ? `${slug(f.make)}/${f.model ? `${slug(f.model)}/` : ""}` : "";
  const links = [
    {
      id: "trademe",
      label: "Trade Me Motors",
      url: words
        ? `https://www.trademe.co.nz/a/motors/cars/search?search_string=${enc}`
        : "https://www.trademe.co.nz/a/motors/cars",
    },
    {
      id: "turners",
      label: "Turners",
      url: makeModelPath && !f.q
        ? `https://www.turners.co.nz/Cars/Used-Cars-for-Sale/${makeModelPath}`
        : `https://www.turners.co.nz/Cars/Used-Cars-for-Sale/${words ? `?searchfor=${encodeURIComponent(words).replace(/%20/g, "+")}` : ""}`,
    },
    {
      id: "autotrader",
      label: "AutoTrader NZ",
      url: makeModelPath && !f.q
        ? `https://www.autotrader.co.nz/used-cars-for-sale/${makeModelPath.replace(/\/$/, "")}`
        : `https://www.autotrader.co.nz/used-cars-for-sale${words ? `?keyword=${encodeURIComponent(words).replace(/%20/g, "+")}` : ""}`,
    },
    {
      id: "facebook",
      label: "Facebook Marketplace",
      url: `https://www.facebook.com/marketplace/category/vehicles${words ? `?query=${enc}` : ""}`,
    },
    {
      id: "carjam",
      label: f.rego ? `CarJam: ${f.rego.toUpperCase()}` : "CarJam rego check",
      url: f.rego ? `https://www.carjam.co.nz/car/?plate=${encodeURIComponent(f.rego.toUpperCase())}` : "https://www.carjam.co.nz/",
    },
  ];
  return links;
}

/* ------------------------------------------------------------------ */
/* Shared link previews: members share ONE listing URL from these sites. */
/* ------------------------------------------------------------------ */
export const SHARE_SITES = {
  trademe: { label: "Trade Me", hosts: ["trademe.co.nz", "www.trademe.co.nz"] },
  turners: { label: "Turners", hosts: ["turners.co.nz", "www.turners.co.nz"] },
  autotrader: { label: "AutoTrader NZ", hosts: ["autotrader.co.nz", "www.autotrader.co.nz"] },
  facebook: { label: "Facebook Marketplace", hosts: ["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com"] },
  carjam: { label: "CarJam", hosts: ["carjam.co.nz", "www.carjam.co.nz"] },
} as const;
export type ShareSite = keyof typeof SHARE_SITES;

export function siteForHost(host: string): ShareSite | null {
  const h = host.toLowerCase().replace(/\.$/, "");
  for (const [id, s] of Object.entries(SHARE_SITES)) if ((s.hosts as readonly string[]).includes(h)) return id as ShareSite;
  return null;
}

const TRACKING = /^(utm_|rsqid$|bof$|fbclid$|gclid$|mibextid$|ref$|refid$|referral|rdid$|share_url$|_rdr$|__)/i;

/**
 * Validate a pasted URL: https, allowlisted host, default port, no credentials, and shaped like ONE listing
 * (not a search/category page). Returns the canonical URL (fragment and tracking params stripped).
 */
export function parseShareUrl(raw: string): { url: string; site: ShareSite } | { error: string } {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return { error: "That doesn't look like a link." };
  }
  if (u.protocol !== "https:") return { error: "Only https:// links are accepted." };
  if (u.username || u.password || u.port) return { error: "That link isn't supported." };
  const site = siteForHost(u.hostname);
  if (!site) return { error: "Only Trade Me, Turners, AutoTrader NZ, Facebook Marketplace or CarJam links can be shared." };
  u.hash = "";
  for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
  const p = u.pathname.toLowerCase();
  const ok = {
    trademe: /\/listing\/\d{6,}/.test(p) || /auction-\d{6,}\.htm/.test(p),
    turners: /\/\d{5,}\/?$/.test(p) || /\/\d{5,}\//.test(p),
    // AutoTrader renders listings client-side; accept an id segment or a deep make/model/listing path.
    autotrader:
      !/^\/(car-dealers|car-reviews|brands|my-account|sell-my-car|create-listing|search)/.test(p) &&
      !u.searchParams.has("keyword") &&
      (/\/\d{5,}(\/|$)/.test(p) || /^\/(listing|car|vehicle|cars)\/[^/]+/.test(p) || p.replace(/\/$/, "").split("/").length >= 5),
    facebook: /^\/marketplace\/item\/\d{6,}\/?$/.test(p),
    carjam: (p === "/car/" || p === "/car") && /^[a-z0-9]{1,7}$/i.test(u.searchParams.get("plate") || ""),
  }[site];
  if (!ok) {
    return {
      error: site === "facebook"
        ? "Paste a single Marketplace item link (facebook.com/marketplace/item/…)."
        : site === "carjam"
          ? "Paste a CarJam vehicle link (carjam.co.nz/car/?plate=…)."
          : `Paste the link to one ${SHARE_SITES[site].label} listing, not a search page.`,
    };
  }
  // One canonical host per site so the same listing can't be shared twice via www/non-www variants.
  u.hostname = { trademe: "www.trademe.co.nz", turners: "www.turners.co.nz", autotrader: "autotrader.co.nz", facebook: "www.facebook.com", carjam: "www.carjam.co.nz" }[site];
  if (site === "trademe" || site === "turners" || site === "autotrader") u.pathname = u.pathname.replace(/\/+$/, "") || "/";
  if (site === "facebook") {
    // Keep only the item path for Facebook; their query strings are tracking/session state.
    u.search = "";
    u.pathname = u.pathname.replace(/\/?$/, "/");
  }
  if (site === "carjam") u.search = `?plate=${encodeURIComponent((u.searchParams.get("plate") || "").toUpperCase())}`;
  return { url: u.toString(), site };
}

export type SharedLink = {
  id: string;
  site: ShareSite;
  siteLabel: string;
  url: string;
  title: string | null;
  titleSource: "og" | "member" | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  price: number | null;
  fetchStatus: "ok" | "no_og" | "blocked" | "robots" | "error";
  status: "active" | "removed";
  createdAt: string;
  sharer: AutoSeller;
  reports?: number;
};
