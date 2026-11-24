import {
  Car,
  CarFront,
  ClipboardCheck,
  Cpu,
  FileText,
  Gamepad2,
  Home,
  Layers,
  MapPin,
  MessageSquare,
  MessagesSquare,
  Printer,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  /** Full page load (static HTML apps under /public). */
  external?: boolean;
  tone?: "red" | "blue" | "ink" | "white";
};

/** Hero app: the true-size NZ plate sticker maker (static /plates/index.html). */
export const PLATES: NavItem = {
  href: "/plates/index.html",
  label: "Plate maker",
  hint: "True-size 360×124 mm NZ plate stickers",
  icon: CarFront,
  external: true,
  tone: "red",
};

/** Every section of the site, as app tiles. */
/** Siftah Auto: NZ vehicle marketplace. */
export const AUTO: NavItem = { href: "/auto", label: "Siftah Auto", hint: "Cars for sale · list yours", icon: Car, tone: "blue" };

/** Rego Checker: plate lookup (CarJam) + link to the official NZTA expiry check + reminders. */
export const REGO: NavItem = { href: "/auto/rego", label: "Rego Checker", hint: "Plate lookup & expiry reminders", icon: ClipboardCheck, tone: "blue" };

/** PinDrop: offline-first map pin app (static PWA at /pindrop/). */
export const PINDROP: NavItem = {
  href: "/pindrop/",
  label: "PinDrop",
  hint: "Offline map pins for tools, radars & crew",
  icon: MapPin,
  external: true,
  tone: "red",
};

export const APPS: NavItem[] = [
  PLATES,
  PINDROP,
  { href: "/", label: "Marketplace", hint: "Buy, sell & swap tech", icon: Home, tone: "ink" },
  AUTO,
  REGO,
  { href: "/shop", label: "Shop", hint: "Browse categories", icon: ShoppingBag, tone: "ink" },
  { href: "/sell", label: "Sell", hint: "List your gear", icon: Store, tone: "ink" },
  { href: "/arcade", label: "Arcade", hint: "Free browser games", icon: Gamepad2, tone: "blue" },
  { href: "/siftah/", label: "Mr CluedUp", hint: "AI chat, images & modes", icon: Sparkles, external: true, tone: "red" },
  { href: "/siftah-message", label: "Siftah Message", hint: "Opens the chat window", icon: MessageSquare, tone: "ink" },
  { href: "/forum", label: "Forum", hint: "Community den", icon: MessagesSquare, tone: "ink" },
  { href: "/account", label: "Wallet", hint: "Account & PayPal", icon: Wallet, tone: "ink" },
  { href: "/prints", label: "Prints", hint: "Print studio", icon: Printer, tone: "ink" },
  { href: "/build", label: "PC Builder", hint: "Spec a custom rig", icon: Cpu, tone: "ink" },
  { href: "/overlay", label: "Overlay", hint: "Stream overlay studio", icon: Layers, tone: "ink" },
];

export const LEGAL: NavItem[] = [
  { href: "/termsandconditions", label: "Terms & Conditions", hint: "", icon: FileText },
  { href: "/storepolicy", label: "Store Policy", hint: "", icon: ShieldCheck },
];

/** Desktop top-bar links. */
export const TOP_LINKS: NavItem[] = [
  APPS[2], // Marketplace
  AUTO,
  APPS[5], // Shop
  PLATES,
  PINDROP,
  APPS[7], // Arcade
  APPS[8], // Mr CluedUp (AI)
  APPS[6], // Sell
];

export function isActive(pathname: string, href: string): boolean {
  const clean = href.replace(/index\.html$/, "").replace(/\/$/, "") || "/";
  if (clean === "/") return pathname === "/";
  return pathname === clean || pathname.startsWith(clean + "/");
}
