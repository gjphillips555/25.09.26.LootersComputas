import type { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { SiftahAppBar } from "./app-bar";
import { SiftahChatHead } from "./chat-head";
import { SiftahTabBar } from "./tab-bar";

/** Paths that render full-screen without the app chrome. */
const BARE = [/^\/overlay/, /^\/hidden/, /^\/plates/];

/** Global Siftah app chrome: top bar + drawer, mobile tab bar, chat head. */
export function SiftahFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  if (BARE.some((re) => re.test(pathname))) return <>{children}</>;
  return (
    <div className="siftah-has-tabbar min-h-dvh lg:pb-0">
      <SiftahAppBar />
      {children}
      <SiftahTabBar />
      <SiftahChatHead />
    </div>
  );
}
