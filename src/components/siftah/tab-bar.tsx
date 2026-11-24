import { useLocation } from "@tanstack/react-router";
import { Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TAB_ITEMS, useTabbarConfig } from "@/lib/tabbar";
import { isActive, type NavItem } from "./nav";
import { NavLink } from "./nav-link";

/** Mobile bottom tab bar: raised centre button (Plates by default) + 4 slots, all chosen in Settings (siftah_tabbar cookie). */
export function SiftahTabBar() {
  const { pathname } = useLocation();
  const cfg = useTabbarConfig();
  const center = TAB_ITEMS[cfg.center] as NavItem;
  const left = cfg.slots.slice(0, 2).map((id) => TAB_ITEMS[id] as NavItem);
  const right = cfg.slots.slice(2).map((id) => TAB_ITEMS[id] as NavItem);
  const tab = (item: NavItem) => {
    const active = isActive(pathname, item.href);
    return (
      <NavLink
        key={item.href}
        item={item}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-bold uppercase tracking-wide",
          active ? "text-white" : "text-white/55",
        )}
      >
        <item.icon className={cn("size-5", active && "text-[#5cc8f2]")} strokeWidth={2.2} />
        {item.label}
      </NavLink>
    );
  };
  return (
    <nav
      className="siftah-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b0b0c]/95 backdrop-blur-md lg:hidden"
      aria-label="App tabs"
      data-testid="tab-bar"
      data-center={cfg.center}
    >
      <div className="mx-auto flex h-16 max-w-md items-stretch px-2">
        {left.map(tab)}
        <div className="flex flex-1 justify-center">
          <NavLink
            item={center}
            className="-mt-5 flex size-16 flex-col items-center justify-center rounded-full border-4 border-[#0b0b0c] bg-[#e3121b] text-white shadow-[0_8px_24px_-6px_rgba(227,18,27,0.7)]"
            title={center.hint || center.label}
          >
            <center.icon className="size-6" strokeWidth={2.3} />
            <span className="text-[9px] font-black uppercase leading-none" data-testid="tab-center-label">{center.label}</span>
          </NavLink>
        </div>
        {right.map(tab)}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("siftah:open-menu"))}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/55"
        >
          <Grid3x3 className="size-5" strokeWidth={2.2} />
          Menu
        </button>
      </div>
    </nav>
  );
}
