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
};

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
