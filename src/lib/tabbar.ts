import { useEffect, useState } from "react";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import {
  Car, CarFront, ClipboardCheck, Gamepad2, Home, MapPin, MessageSquare, MessagesSquare, ShoppingBag, Sparkles, Store, Wallet,
} from "lucide-react";
import type { NavItem } from "@/components/siftah/nav";

/** Items a member can put in the mobile tab bar (centre raised button + 4 side slots). */
export const TAB_ITEMS = {
  plates: { href: "/plates/index.html", label: "Plates", hint: "Plate maker", icon: CarFront, external: true },
  pindrop: { href: "/pindrop/", label: "PinDrop", hint: "Offline map pins", icon: MapPin, external: true },
  auto: { href: "/auto", label: "Auto", hint: "Siftah Auto", icon: Car },
  rego: { href: "/auto/rego", label: "Rego", hint: "Rego Checker", icon: ClipboardCheck },
  messages: { href: "/siftah-message", label: "Messages", hint: "Opens the chat window", icon: MessageSquare },
  ai: { href: "/siftah/", label: "CluedUp", hint: "Mr CluedUp AI", icon: Sparkles, external: true },
  home: { href: "/", label: "Home", hint: "Marketplace", icon: Home },
  shop: { href: "/shop", label: "Shop", hint: "Browse categories", icon: ShoppingBag },
  arcade: { href: "/arcade", label: "Arcade", hint: "Free games", icon: Gamepad2 },
  sell: { href: "/sell", label: "Sell", hint: "List your gear", icon: Store },
  forum: { href: "/forum", label: "Forum", hint: "Community", icon: MessagesSquare },
  wallet: { href: "/account", label: "Wallet", hint: "Account & PayPal", icon: Wallet },
} satisfies Record<string, NavItem>;

export type TabId = keyof typeof TAB_ITEMS;
export type TabbarConfig = { center: TabId; slots: [TabId, TabId, TabId, TabId] };

export const TAB_IDS = Object.keys(TAB_ITEMS) as TabId[];
export const DEFAULT_TABBAR: TabbarConfig = { center: "plates", slots: ["home", "shop", "auto", "pindrop"] };
export const TABBAR_COOKIE = "siftah_tabbar";

const isId = (v: string): v is TabId => (TAB_IDS as string[]).includes(v);

/** Cookie value "center|a,b,c,d". Anything invalid falls back to the default; duplicates are dropped and refilled. */
export function parseTabbar(raw: string | null | undefined): TabbarConfig {
  if (!raw) return DEFAULT_TABBAR;
  let v = raw;
  try {
    v = decodeURIComponent(raw);
  } catch {
    return DEFAULT_TABBAR;
  }
  const [c, s = ""] = v.split("|");
  if (!c || !isId(c)) return DEFAULT_TABBAR;
  const used = new Set<TabId>([c]);
  const slots: TabId[] = [];
  for (const id of s.split(",")) {
    if (isId(id) && !used.has(id) && slots.length < 4) {
      used.add(id);
      slots.push(id);
    }
  }
  for (const id of [...DEFAULT_TABBAR.slots, DEFAULT_TABBAR.center, ...TAB_IDS]) {
    if (slots.length >= 4) break;
    if (!used.has(id)) {
      used.add(id);
      slots.push(id);
    }
  }
  return { center: c, slots: slots as TabbarConfig["slots"] };
}

export function serializeTabbar(c: TabbarConfig): string {
  return `${c.center}|${c.slots.join(",")}`;
}

function readDocumentCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${TABBAR_COOKIE}=([^;]*)`));
  return m ? m[1] : null;
}

/** Reads the cookie on the server during SSR and from document.cookie in the browser, so first paint matches. */
export const readTabbarCookie = createIsomorphicFn()
  .server(() => {
    try {
      return getCookie(TABBAR_COOKIE) ?? null;
    } catch {
      return null;
    }
  })
  .client(() => readDocumentCookie());

export function saveTabbar(c: TabbarConfig | null) {
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  if (!c || serializeTabbar(c) === serializeTabbar(DEFAULT_TABBAR)) {
    document.cookie = `${TABBAR_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
  } else {
    document.cookie = `${TABBAR_COOKIE}=${encodeURIComponent(serializeTabbar(c))}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
  }
  window.dispatchEvent(new Event("siftah:tabbar-changed"));
}

export function useTabbarConfig(): TabbarConfig {
  const [cfg, setCfg] = useState<TabbarConfig>(() => parseTabbar(readTabbarCookie()));
  useEffect(() => {
    const on = () => setCfg(parseTabbar(readDocumentCookie()));
    window.addEventListener("siftah:tabbar-changed", on);
    return () => window.removeEventListener("siftah:tabbar-changed", on);
  }, []);
  return cfg;
}
