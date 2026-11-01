import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";

export function AnalyticsBeacon() {
  const location = useLocation();
  useEffect(() => {
    const path = location.pathname;
    const key = `lc-visit:${path}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch { /* analytics remains best-effort when storage is blocked */ }
    void fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
      keepalive: true,
    }).catch(() => undefined);
  }, [location.pathname]);
  return null;
}
