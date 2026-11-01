import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/admin")({ component: AdminPage });

type Model = string;
type Member = {
  id: string; name: string; email: string; email_verified: boolean; joined_at: string;
  last_seen: string | null; super_saiyan_used: number; siftah_used: number; cooldown_until: string | null;
  siftah_credits: number; siftah_enabled: boolean; paypal_connected: boolean; model_override: string | null;
  free_super_saiyan: number | null; free_siftah: number | null; cooldown_hours: number | null;
  features: Record<string, boolean>;
};
type Dashboard = {
  admin: { email: string; role: "owner" | "admin" };
  stats: Record<string, number>;
  settings: { default_super_model: string; fallback_models: string[]; free_super_saiyan: number; free_siftah: number; cooldown_hours: number; guest_enabled: boolean };
  admins: { email: string; role: string }[];
  members: Member[];
  topPages: { path: string; views: number }[];
  models: Model[];
};

function AdminPage() {
  const { user, isPending } = useCurrentUserState();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState("");
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [settings, setSettings] = useState({ model: "", fallback: [] as string[], freeSuper: 5, freeSiftah: 5, cooldown: 5, guests: true });

  async function load() {
    const response = await fetch("/api/admin", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Admin access required.");
    setData(payload);
    setSettings({ model: payload.settings.default_super_model, fallback: payload.settings.fallback_models, freeSuper: payload.settings.free_super_saiyan, freeSiftah: payload.settings.free_siftah, cooldown: payload.settings.cooldown_hours, guests: payload.settings.guest_enabled });
  }
  useEffect(() => {
    if (isPending || !user) return;
    void load().catch((e) => setError(e.message));
    const timer = window.setInterval(() => { void load().catch(() => undefined); }, 30000);
    return () => window.clearInterval(timer);
  }, [isPending, user?.id]);

  async function post(body: Record<string, unknown>) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Admin action failed.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Admin action failed."); }
    finally { setBusy(false); }
  }

  const filteredMembers = useMemo(() => (data?.members || []).filter((m) => (m.email + " " + m.name).toLowerCase().includes(search.toLowerCase())), [data?.members, search]);

  if (isPending) return <main className="mx-auto max-w-6xl p-6">Checking sign-in…</main>;
  if (!user) return <main className="mx-auto max-w-lg p-6"><section className="rounded-2xl border border-border bg-card p-6 text-center"><h1 className="text-2xl font-bold">Siftah Admin Login</h1><p className="my-3 text-sm text-muted-foreground">Sign in with the authorised administrator email address.</p><a className="inline-flex rounded-xl bg-red-600 px-5 py-3 font-bold text-white" href="/login?callbackURL=%2Fadmin">Sign in</a><p className="mt-4"><Link to="/" className="text-sm underline">Back to Looters Computas</Link></p></section></main>;
  if (error && !data) return <main className="mx-auto max-w-lg p-6"><section className="rounded-2xl border border-border bg-card p-6"><h1 className="text-2xl font-bold">Siftah Admin</h1><p className="mt-3 text-sm text-red-500">{error}</p><p className="mt-3 text-sm text-muted-foreground">Signed in as {user.primaryEmail}. This email is not on the server-side admin allowlist.</p><Link to="/" className="mt-4 inline-block underline">Back to site</Link></section></main>;
  if (!data) return <main className="mx-auto max-w-6xl p-6">Loading admin toolbox…</main>;

  const statCards = [
    ["Members", data.stats.members], ["New members · 7 days", data.stats.new_members_7d],
    ["Active sessions", data.stats.active_sessions], ["Visits · 24 hours", data.stats.visits_24h],
    ["Unique visitors · 24 hours", data.stats.visitors_24h], ["Siftah credits outstanding", data.stats.credits_outstanding],
  ];
  return <main className="mx-auto min-h-dvh max-w-6xl space-y-6 px-3 py-5 sm:px-6">
    <header className="sticky top-2 z-30 rounded-2xl border border-red-500/30 bg-[#09090c]/95 p-3 text-white shadow-xl backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-red-400">Siftah control room</p><h1 className="text-lg font-black sm:text-xl">Admin Toolbox</h1><p className="text-xs text-white/60">{data.admin.email} · {data.admin.role}</p></div>
        <button type="button" onClick={() => setMenuOpen((v) => !v)} className="rounded-lg border border-white/20 px-3 py-2 text-sm font-bold">{menuOpen ? "Close" : "☰ Admin menu"}</button>
      </div>
      {menuOpen && <nav className="mt-3 grid grid-cols-2 gap-2 border-t border-white/15 pt-3 text-sm"><a href="#overview" onClick={() => setMenuOpen(false)} className="rounded-lg bg-white/10 p-2">Overview & stats</a><a href="#models" onClick={() => setMenuOpen(false)} className="rounded-lg bg-white/10 p-2">Models & free use</a><a href="#members" onClick={() => setMenuOpen(false)} className="rounded-lg bg-white/10 p-2">Members</a><a href="#admins" onClick={() => setMenuOpen(false)} className="rounded-lg bg-white/10 p-2">Admin access</a></nav>}
    </header>
    {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
    <section id="overview" className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Live site overview</h2><button onClick={() => void load().catch((e) => setError(e.message))} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">Refresh stats</button></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{statCards.map(([label,value]) => <article key={String(label)} className="rounded-xl border border-border bg-card p-3"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-black tabular-nums">{Number(value || 0).toLocaleString()}</p></article>)}</div><div className="rounded-xl border border-border bg-card p-4"><h3 className="mb-2 font-semibold">Most viewed pages · 7 days</h3>{data.topPages.map((p) => <div key={p.path} className="flex justify-between gap-3 border-t border-border py-2 text-sm"><span className="truncate">{p.path}</span><b className="tabular-nums">{p.views}</b></div>)}<p className="mt-2 text-xs text-muted-foreground">Counts begin after analytics tracking is enabled. No IP addresses or private message contents are collected.</p></div></section>
    <section id="models" className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5"><h2 className="text-lg font-bold">Siftah models & free allowance</h2><p className="text-sm text-muted-foreground">These defaults are enforced by the chat server. Per-member overrides are available below.</p><label className="block text-sm font-semibold">Primary Super Saiyan model<select value={settings.model} onChange={(e) => setSettings((s) => ({...s,model:e.target.value}))} className="mt-1 w-full rounded-lg border border-input bg-background p-2.5">{data.models.map((m) => <option key={m} value={m}>{m}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Fallback models<select multiple value={settings.fallback} onChange={(e) => setSettings((s) => ({...s,fallback:Array.from(e.target.selectedOptions).map(o=>o.value)}))} className="mt-1 min-h-32 w-full rounded-lg border border-input bg-background p-2">{data.models.map((m) => <option key={m} value={m}>{m}</option>)}</select></label><label className="text-sm">Free primary replies<input type="number" min="0" max="100" value={settings.freeSuper} onChange={(e) => setSettings((s) => ({...s,freeSuper:Number(e.target.value)}))} className="mt-1 w-full rounded-lg border border-input bg-background p-2.5"/></label><label className="text-sm">Free fallback replies<input type="number" min="0" max="100" value={settings.freeSiftah} onChange={(e) => setSettings((s) => ({...s,freeSiftah:Number(e.target.value)}))} className="mt-1 w-full rounded-lg border border-input bg-background p-2.5"/><span className="mt-2 block">Cooldown hours<input type="number" min="0" max="168" value={settings.cooldown} onChange={(e) => setSettings((s) => ({...s,cooldown:Number(e.target.value)}))} className="mt-1 w-full rounded-lg border border-input bg-background p-2.5"/></span></label></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.guests} onChange={(e) => setSettings((s) => ({...s,guests:e.target.checked}))}/> Allow guest mode</label><button disabled={busy} onClick={() => void post({action:"update_defaults",defaultSuperModel:settings.model,fallbackModels:settings.fallback,freeSuperSaiyan:settings.freeSuper,freeSiftah:settings.freeSiftah,cooldownHours:settings.cooldown,guestEnabled:settings.guests})} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Save Siftah defaults</button></section>
    <section id="members" className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">Members & Siftah usage</h2><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search name or email" className="w-full max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm"/></div><div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-secondary text-muted-foreground"><tr>{["Member","Joined","Last seen","Email","PayPal link","Siftah credits","Free use","Controls"].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{filteredMembers.map((m)=><tr key={m.id} className="border-t border-border"><td className="p-3"><b>{m.name}</b><div className="text-muted-foreground">{m.email}</div></td><td className="p-3">{new Date(m.joined_at).toLocaleDateString()}</td><td className="p-3">{m.last_seen ? new Date(m.last_seen).toLocaleString() : "—"}</td><td className="p-3">{m.email_verified ? "Verified" : "Unverified"}</td><td className="p-3">{m.paypal_connected ? "Connected" : "—"}</td><td className="p-3 font-bold">{m.siftah_credits}</td><td className="p-3">{m.super_saiyan_used} + {m.siftah_used}</td><td className="p-3"><button onClick={()=>setSelectedMember(m)} className="rounded-lg border border-border px-2.5 py-1.5 font-semibold">Adjust</button></td></tr>)}</tbody></table></div></section>
    {selectedMember && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-3"><section className="max-h-[90dvh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><h3 className="font-bold">Adjust {selectedMember.email}</h3><button onClick={()=>setSelectedMember(null)} className="rounded-lg border border-border px-3 py-1">Close</button></div><MemberEditor member={selectedMember} models={data.models} busy={busy} onSave={(payload)=>void post({action:"update_member",userId:selectedMember.id,...payload}).then(()=>setSelectedMember(null))}/></section></div>}
    {data.admin.role === "owner" && <section id="admins" className="space-y-3 rounded-2xl border border-border bg-card p-4"><h2 className="text-lg font-bold">Admin access list</h2><p className="text-sm text-muted-foreground">Only the owner account can add or remove administrators.</p><form onSubmit={(e)=>{e.preventDefault();void post({action:"add_admin",email:newAdmin}).then(()=>setNewAdmin(""));}} className="flex flex-col gap-2 sm:flex-row"><input type="email" required value={newAdmin} onChange={(e)=>setNewAdmin(e.target.value)} placeholder="another-admin@example.com" className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm"/><button disabled={busy} className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white">Add admin</button></form>{data.admins.map((a)=><div key={a.email} className="flex items-center justify-between gap-3 border-t border-border py-2 text-sm"><span className="min-w-0 break-all">{a.email} · {a.role}</span>{a.role!=="owner"&&<button onClick={()=>void post({action:"remove_admin",email:a.email})} className="rounded-lg border border-border px-2 py-1 text-xs">Remove</button>}</div>)}</section>}
    <p className="pb-8 text-xs text-muted-foreground">Member data shown here is limited to account details, usage, credits and sign-in activity. PayPal balances and payment credentials are not displayed in the admin toolbox.</p>
  </main>;
}

function MemberEditor({member,models,busy,onSave}:{member:Member;models:string[];busy:boolean;onSave:(payload:Record<string,unknown>)=>void}) {
 const [enabled,setEnabled]=useState(member.siftah_enabled);
 const [model,setModel]=useState(member.model_override||"");
 const [freeSuper,setFreeSuper]=useState(member.free_super_saiyan?.toString()||"");
 const [freeSiftah,setFreeSiftah]=useState(member.free_siftah?.toString()||"");
 const [cooldown,setCooldown]=useState(member.cooldown_hours?.toString()||"");
 return <form onSubmit={(e)=>{e.preventDefault();onSave({enabled,modelOverride:model||null,freeSuperSaiyan:freeSuper===""?null:Number(freeSuper),freeSiftah:freeSiftah===""?null:Number(freeSiftah),cooldownHours:cooldown===""?null:Number(cooldown)});}} className="space-y-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={(e)=>setEnabled(e.target.checked)}/> Allow Siftah access</label><label className="block text-sm">Model override<select value={model} onChange={(e)=>setModel(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background p-2"><option value="">Use global default</option>{models.map(m=><option key={m} value={m}>{m}</option>)}</select></label>{[["Free primary replies",freeSuper,setFreeSuper],["Free fallback replies",freeSiftah,setFreeSiftah],["Cooldown hours",cooldown,setCooldown]].map(([label,value,setter])=><label key={label as string} className="block text-sm">{label as string}<input type="number" min="0" max="168" value={value as string} onChange={(e)=>(setter as (v:string)=>void)(e.target.value)} placeholder="Use global default" className="mt-1 w-full rounded-lg border border-input bg-background p-2"/></label>)}<button disabled={busy} className="w-full rounded-xl bg-red-600 p-2.5 font-bold text-white disabled:opacity-50">Save member controls</button></form>;
}
