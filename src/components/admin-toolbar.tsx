import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

type Summary = { stats: { members: number; visits_24h: number; visitors_24h: number }; admin: { email: string; role: string } };

export function AdminToolbar() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/admin", { cache: "no-store" }).then(async (r) => {
      if (!r.ok) return null;
      return await r.json() as Summary;
    }).then((data) => { if (active && data?.admin) setSummary(data); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  if (!summary) return null;
  return <div className="relative z-[60] border-b border-red-500/30 bg-[#09090c] text-white">
    <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-1.5 text-[11px] sm:px-6">
      <div className="flex min-w-0 items-center gap-2"><span className="size-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"/><b className="truncate">ADMIN · {summary.admin.role.toUpperCase()}</b><span className="hidden text-white/60 sm:inline">{summary.stats.members} members</span><span className="hidden text-white/60 md:inline">{summary.stats.visits_24h} visits today</span></div>
      <button type="button" onClick={()=>setOpen(v=>!v)} className="shrink-0 rounded-md border border-white/20 px-2.5 py-1 font-bold">{open ? "Close" : "☰ Tools"}</button>
    </div>
    {open && <div className="mx-auto grid max-w-6xl grid-cols-2 gap-2 px-3 pb-3 sm:px-6"><Link to="/admin" className="rounded-lg bg-red-600 px-3 py-2 text-center text-xs font-bold">Admin toolbox</Link><Link to="/account" className="rounded-lg bg-white/10 px-3 py-2 text-center text-xs font-semibold">Wallet & credits</Link><span className="col-span-2 text-[10px] text-white/60">{summary.admin.email} · {summary.stats.visitors_24h} unique visitors today</span></div>}
  </div>;
}
