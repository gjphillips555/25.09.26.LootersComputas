import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { NavItem } from "./nav";

/** Internal routes use client-side Links; static apps (/plates, /siftah) get a full page load. */
export function NavLink({
  item,
  className,
  children,
  onClick,
  title,
}: {
  item: NavItem;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  if (item.external) {
    return (
      <a href={item.href} className={className} onClick={onClick} title={title}>
        {children}
      </a>
    );
  }
  return (
    // Routes come from a typed list in nav.ts; TanStack's literal route union can't see that.
    <Link to={item.href as "/"} className={className} onClick={onClick} title={title}>
      {children}
    </Link>
  );
}
