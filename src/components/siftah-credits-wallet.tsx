import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

export function SiftahCreditsWallet() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetch("/api/siftah/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "status" }), cache: "no-store" })
      .then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error || "Could not load Siftah Credits."); return data; })
      .then((data) => { if (active) setBalance(Number(data.usage?.creditsBalance ?? 0)); })
      .catch(() => { if (active) setBalance(0); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <section className="rounded-2xl border border-red-500/25 bg-gradient-to-br from-[#100b0c] to-card p-5 text-white">
    <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-red-400">Siftah wallet</p><h2 className="mt-1 text-lg font-bold">Siftah Credits</h2></div><span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300">AI credits</span></div>
    <p className="mt-3 text-3xl font-black tabular-nums">{loading ? "…" : balance}</p>
    <p className="mt-1 text-xs text-white/60">Credits are shared between your Looters Computas account and Siftah Mobile login.</p>
    <Link to="/siftah" className="mt-4 inline-flex rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500">Open Siftah / Buy credits →</Link>
  </section>;
}
