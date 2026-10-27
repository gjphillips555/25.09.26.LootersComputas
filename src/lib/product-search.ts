import { create } from "zustand";
import type { Product } from "@/lib/products";

export type ShopCategoryId =
  | "desktops"
  | "laptops"
  | "monitors"
  | "components"
  | "cables"
  | "gift-cards"
  | "digital"
  | "batteries"
  | "ink"
  | "all";

export const SHOP_CATEGORIES: { id: ShopCategoryId; label: string }[] = [
  { id: "desktops", label: "Desktops" },
  { id: "laptops", label: "Laptops" },
  { id: "monitors", label: "Monitors" },
  { id: "components", label: "Components" },
  { id: "cables", label: "Cables & Plugs" },
  { id: "gift-cards", label: "Gift cards" },
  { id: "digital", label: "Digital" },
  { id: "batteries", label: "Batteries" },
  { id: "ink", label: "Ink" },
  { id: "all", label: "All products" },
];

export const SHOP_CATEGORY_PAGES = [
  "desktops",
  "laptops",
  "monitors",
  "components",
  "cables",
  "gift-cards",
  "digital",
  "batteries",
  "ink",
] as const;
export type ShopCategoryPage = (typeof SHOP_CATEGORY_PAGES)[number];

/**
 * First letter of the category + a digit that looks like the 2nd letter.
 * Laptops LA→L4, Desktops DE→D3, Components CO→C0,
 * Monitors MO→M0, Cables CA→C4, Gift cards GI→G1,
 * Batteries BA→B4. Ink has no digit-like second letter, so I1.
 */
export const TITLE_CATEGORY_CODES: {
  id: ShopCategoryPage;
  label: string;
  sample: string;
}[] = [
  { id: "laptops", label: "Laptops", sample: "L4" },
  { id: "desktops", label: "Desktops", sample: "D3" },
  { id: "monitors", label: "Monitors", sample: "M0" },
  { id: "components", label: "Components", sample: "C0" },
  { id: "cables", label: "Cables & Plugs", sample: "C4" },
  { id: "gift-cards", label: "Gift cards", sample: "G1" },
  { id: "digital", label: "Digital", sample: "D1" },
  { id: "batteries", label: "Batteries", sample: "B4" },
  { id: "ink", label: "Ink", sample: "I1" },
];

const TITLE_STAMP: Record<string, ShopCategoryPage> = {
  L4: "laptops",
  D3: "desktops",
  M0: "monitors",
  C0: "components",
  C4: "cables",
  G1: "gift-cards",
  D1: "digital",
  B4: "batteries",
  I1: "ink",
};

export function categoryFromTitleCode(title: string): ShopCategoryPage | null {
  const upper = title.toUpperCase();
  const found: { id: ShopCategoryPage; index: number }[] = [];
  for (const [code, id] of Object.entries(TITLE_STAMP) as [string, ShopCategoryPage][]) {
    const re = new RegExp(`(^|[^A-Z0-9])${code}([^A-Z0-9]|$)`);
    const m = re.exec(upper);
    if (m && m.index != null) found.push({ id, index: m.index });
  }
  if (found.length === 0) return null;
  found.sort((a, b) => a.index - b.index);
  return found[0].id;
}

function inferFromTradeMe(product: Product): ShopCategoryPage | null {
  const n = (product.categoryNumber ?? "").replace(/-+$/g, "");
  const path = (product.categoryPath ?? "")
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "");
  const trimmed = path.startsWith("/") ? path : `/${path}`;
  if (n.startsWith("0002-0356") || trimmed.includes("/computers/laptops")) {
    return "laptops";
  }
  if (n.startsWith("0002-4715") || trimmed.includes("/computers/desktops")) {
    return "desktops";
  }
  if (
    n.startsWith("0002-0359") ||
    /\/computers\/(components|parts|internal-storage|memory|graphics)/.test(trimmed)
  ) {
    return "components";
  }
  return null;
}

const LAPTOP_MACHINE =
  /\b(laptop|notebook|macbook|chromebook|ultrabook|elitebook|probook|zbook|thinkpad|thinkbook|latitude|xps\s?(13|14|15|16)|zenbook|vivobook|expertbook|surface (laptop|pro|go|book)|pavilion (13|14|15|16|17|x360)|envy (13|14|15|16|17)|inspiron (13|14|15|16|17)|vostro (13|14|15|16)|spectre|2[- ]in[- ]1)\b/i;

const DESKTOP_MACHINE =
  /\b(desktop|optiplex|prodesk|elitedesk|thinkcentre|thinkstation|sff\b|usff\b|mini-?pc|\bnuc\b|mac mini|mac studio|\bimac\b|mac pro|gaming pc|gaming desktop|\btower\b|workstation|hp 290|hp 280|hp 400 g|hp 600 g|hp 800 g)\b/i;

const LAPTOP_PART =
  /\b((laptop|notebook)s?\s+(bag|sleeve|backpack|case|stand|cooler)|((bag|sleeve|backpack|case)\b.{0,24}\b(laptop|notebook)))\b/i;

const INK_ITEM =
  /\b(ink cartridges?|toner|inkjet|megatank|maintenance cartridge)\b/i;

const BATTERY_ITEM = /\b((laptop|notebook)\s+batter(y|ies))\b/i;

const CABLE_ITEM =
  /\b(hdmi|display\s?port|displayport|usb-?c|usb\s?type-?c|chargers?|ac adapters?|power (cable|lead|cord)|jug cords?|kettle leads?|iec\s?c[157]|clover|figure-?8|ethernet|cat\s?[56]e?\b|rj-?45|sata|cable ties?|zip ties?|vga\b|dvi\b|extension leads?|power boards?)\b/i;

const MONITOR_ITEM = /\b(monitors?|computer displays?)\b/i;
const NOT_A_MONITOR = /\b(graphics card|gpu|geforce|radeon|for (an )?extra monitor)\b/i;

function inferKindFromTitle(title: string): ShopCategoryPage {
  if (/\bdigital key\b/i.test(title)) return "digital";
  if (LAPTOP_PART.test(title)) return "components";
  if (LAPTOP_MACHINE.test(title)) return "laptops";
  if (DESKTOP_MACHINE.test(title)) return "desktops";
  const wholePc =
    /\bwindows\s?(7|8|10|11)\b/i.test(title) &&
    /\b(i[3579]|ryzen|intel|core)\b/i.test(title);
  if (wholePc) return "desktops";
  return "components";
}

/** Stamp wins. A whole laptop that merely includes a charger stays a laptop. */
export function productKind(product: Product): ShopCategoryPage {
  const stamped = categoryFromTitleCode(product.title);
  if (stamped) return stamped;
  if (INK_ITEM.test(product.title)) return "ink";
  if (/\bdigital key\b/i.test(product.title)) return "digital";
  if (BATTERY_ITEM.test(product.title)) return "batteries";
  if (/\bchargers?\b/i.test(product.title) && !/\bincludes chargers?\b/i.test(product.title)) {
    return "cables";
  }
  if (LAPTOP_PART.test(product.title)) return "components";
  if (LAPTOP_MACHINE.test(product.title)) return "laptops";
  if (DESKTOP_MACHINE.test(product.title)) return "desktops";
  if (CABLE_ITEM.test(product.title)) return "cables";
  if (MONITOR_ITEM.test(product.title) && !NOT_A_MONITOR.test(product.title)) return "monitors";
  if (/\bgift\s?cards?\b/i.test(product.title)) return "gift-cards";
  return inferFromTradeMe(product) ?? inferKindFromTitle(product.title);
}

export type PriceSort = "default" | "price-asc" | "price-desc";

export function isShopCategoryPage(value: string): value is ShopCategoryPage {
  return (SHOP_CATEGORY_PAGES as readonly string[]).includes(value);
}

export function shopPath(id: ShopCategoryId) {
  return id === "all" ? "/shop" : `/shop/${id}`;
}

export function productInCategory(product: Product, category: ShopCategoryId) {
  if (category === "all") return true;
  return productKind(product) === category;
}

/** What sort of thing this is, so a sold-out GPU suggests another GPU. */
export function itemSort(title: string): string {
  if (LAPTOP_PART.test(title)) return "laptop-part";
  if (/\b(charger|ac adapter)\b/i.test(title) && !/\bincludes charger\b/i.test(title)) return "charger";
  if (BATTERY_ITEM.test(title)) return "battery";
  if (INK_ITEM.test(title)) return "ink";
  if (/\bdigital key\b/i.test(title)) return "digital-key";
  if (LAPTOP_MACHINE.test(title)) return "laptop";
  if (DESKTOP_MACHINE.test(title)) return "desktop";
  if (/\b(graphics card|geforce|radeon|\brtx\b|\bgtx\b|quadro|\barc\b)\b/i.test(title)) return "gpu";
  if (/\b(ddr[345]|memory kit|\bram\b)\b/i.test(title)) return "ram";
  if (/\b(nvme|\bssd\b|hard drive|\bhdd\b)\b/i.test(title)) return "storage";
  if (/\b(power supply|\bpsu\b)\b/i.test(title)) return "psu";
  if (/\b(system fan|case fan)\b/i.test(title)) return "fan";
  if (/\b(air cooler|cpu cooler|liquid cool|\baio\b)\b/i.test(title)) return "cooler";
  if (/\b(motherboard|mainboard)\b/i.test(title)) return "motherboard";
  if (/\b(\bcpu\b|processor)\b/i.test(title)) return "cpu";
  if (MONITOR_ITEM.test(title) && !NOT_A_MONITOR.test(title)) return "monitor";
  if (/\bhdmi\b/i.test(title)) return "hdmi";
  if (/\bdisplay\s?port\b/i.test(title)) return "displayport";
  if (/\bethernet|cat\s?[56]/i.test(title)) return "ethernet";
  if (/\bsata\b/i.test(title)) return "sata";
  if (/\bvga\b/i.test(title)) return "vga";
  if (/\b(cable ties|zip ties)\b/i.test(title)) return "cable-tie";
  if (/\b(jug cord|clover|figure-8|power cable|power lead)\b/i.test(title)) return "power-lead";
  if (CABLE_ITEM.test(title)) return "cable";
  return "other";
}

export function isPurchasable(product: Product) {
  return !product.soldOut && product.buyNow && product.amount > 0;
}

export function similarAvailable(product: Product, all: Product[], limit = 3) {
  const sort = itemSort(product.title);
  const category = productKind(product);
  const open = all.filter((p) => p.id !== product.id && isPurchasable(p));
  const sameSort = open.filter((p) => itemSort(p.title) === sort && productKind(p) === category);
  return sameSort.slice(0, limit);
}

export function categoryBadge(product: Product) {
  const id = productKind(product);
  return SHOP_CATEGORIES.find((c) => c.id === id)?.label ?? "";
}

/** Detector list — used to spot brands in titles. Unknown brands still surface via attributes. */
const BRAND_DETECT = [
  "HP",
  "Hewlett Packard",
  "Brother",
  "Canon",
  "Epson",
  "Lexmark",
  "Dell",
  "Lenovo",
  "ThinkPad",
  "ThinkCentre",
  "ASUS",
  "ROG",
  "Acer",
  "MSI",
  "Apple",
  "MacBook",
  "iMac",
  "Microsoft",
  "Surface",
  "GIGABYTE",
  "Gigabyte",
  "Aorus",
  "Intel",
  "AMD",
  "NVIDIA",
  "GeForce",
  "Radeon",
  "Corsair",
  "Razer",
  "Logitech",
  "SteelSeries",
  "HyperX",
  "Attack Shark",
  "NZXT",
  "Cooler Master",
  "Thermaltake",
  "G.SKILL",
  "G.Skill",
  "Kingston",
  "Samsung",
  "Seagate",
  "Western Digital",
  "WD ",
  "Toshiba",
  "Fujitsu",
  "Panasonic",
  "Sony",
  "LG",
  "BenQ",
  "ViewSonic",
  "Philips",
  "Alienware",
  "Framework",
  "Raspberry Pi",
  "Elgato",
  "EVGA",
  "ASRock",
  "XFX",
  "Sapphire",
  "PowerColor",
  "Zotac",
  "Palit",
  "PNY",
  "Crucial",
  "SanDisk",
  "Patriot",
  "TeamGroup",
  "be quiet!",
  "Fractal",
  "Lian Li",
  "Phanteks",
  "Deepcool",
  "Noctua",
  "Arctic",
  "TP-Link",
  "Netgear",
  "Ubiquiti",
  "Cisco",
  "Synology",
  "QNAP",
  "Wacom",
  "Huawei",
  "Honor",
  "Xiaomi",
  "MSI",
  "Compaq",
  "IBM",
  "Gateway",
  "eMachines",
  "Clevo",
  "Tongfang",
  "Razer",
  "Corsair",
];

const BRAND_ALIAS: Record<string, string> = {
  "hewlett packard": "HP",
  thinkpad: "Lenovo",
  thinkcentre: "Lenovo",
  thinkbook: "Lenovo",
  macbook: "Apple",
  imac: "Apple",
  "mac mini": "Apple",
  "mac studio": "Apple",
  "mac pro": "Apple",
  surface: "Microsoft",
  aorus: "GIGABYTE",
  gigabyte: "GIGABYTE",
  rog: "ASUS",
  geforce: "NVIDIA",
  radeon: "AMD",
  "wd ": "Western Digital",
  "western digital": "Western Digital",
  "g.skill": "G.SKILL",
  "attack shark": "Attack Shark",
  "cooler master": "Cooler Master",
  "raspberry pi": "Raspberry Pi",
  "tp-link": "TP-Link",
  "be quiet!": "be quiet!",
  "lian li": "Lian Li",
};

function canonicalBrand(raw: string) {
  const key = raw.toLowerCase().trim();
  if (BRAND_ALIAS[key]) return BRAND_ALIAS[key];
  const hit = BRAND_DETECT.find((b) => b.toLowerCase() === key);
  return hit ?? raw.trim().replace(/\s+/g, " ");
}

export function productBrand(product: Product): string | null {
  const attr = product.attributes.find((a) =>
    /^(brand|manufacturer|make|series)$/i.test(a.name),
  );
  if (attr?.value.trim()) return canonicalBrand(attr.value);

  const title = product.title;
  const lower = title.toLowerCase();
  let found: { name: string; index: number } | null = null;
  for (const brand of BRAND_DETECT) {
    const i = lower.indexOf(brand.toLowerCase());
    if (i < 0) continue;
    const before = i === 0 || !/[a-z0-9]/i.test(title[i - 1] ?? "");
    const after = !/[a-z]/i.test(title[i + brand.length] ?? "");
    if (!before || !after) continue;
    if (!found || i < found.index) found = { name: canonicalBrand(brand), index: i };
  }
  return found?.name ?? null;
}

export function brandsFromProducts(products: Product[]): string[] {
  const set = new Set<string>();
  for (const p of products) {
    const b = productBrand(p);
    if (b) set.add(b);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function productMatchesBrand(product: Product, brand: string) {
  if (!brand || brand === "all") return true;
  const got = productBrand(product);
  if (got && got.toLowerCase() === brand.toLowerCase()) return true;
  return product.title.toLowerCase().includes(brand.toLowerCase());
}

export const useProductSearch = create<{
  query: string;
  category: ShopCategoryId;
  sort: PriceSort;
  brand: string;
  setQuery: (query: string) => void;
  setCategory: (category: ShopCategoryId) => void;
  setSort: (sort: PriceSort) => void;
  setBrand: (brand: string) => void;
}>((set) => ({
  query: "",
  category: "all",
  sort: "default",
  brand: "all",
  setQuery: (query) => set({ query }),
  setCategory: (category) => set({ category, brand: "all" }),
  setSort: (sort) => set({ sort }),
  setBrand: (brand) => set({ brand }),
}));
