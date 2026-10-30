import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { getPublicListings } from "@/lib/marketplace/listings";
import { nzd } from "@/lib/products";

export const Route = createFileRoute("/market")({
  loader: () => getPublicListings({ data: {} }),
  component: MarketPage,
});

function MarketPage() {
  const initial = Route.useLoaderData();
  const [items,setItems] = useState(initial);
  const [search,setSearch] = useState("");
  const [category,setCategory] = useState("");
  const [busy,setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    setBusy(true);
    void getPublicListings({data:{search,category}}).then(rows => {
      if(live) setItems(rows);
    }).finally(()=>{if(live)setBusy(false)});
    return ()=>{live=false};
  },[search,category]);
  return <AppShell>
    <section className="py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-widest text-orange-500">Community marketplace</p>
          <h1 className="font-display text-3xl font-bold">The Loot Market</h1>
          <p className="mt-1 text-sm text-muted-foreground">Buy, sell and swap computer gear with other looters.</p></div>
        <Link to="/sell" className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white">List an item</Link>
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_220px]">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search listings…" className="rounded-xl border border-input bg-background px-4 py-3"/>
        <select value={category} onChange={e=>setCategory(e.target.value)} className="rounded-xl border border-input bg-background px-4 py-3">
          <option value="">All categories</option>{["Desktops","Laptops","Components","Monitors","Cables & Plugs","Batteries","Ink","Other"].map(x=><option key={x}>{x}</option>)}
        </select>
      </div>
      {busy && <p className="mb-3 text-xs text-muted-foreground">Updating results…</p>}
      {items.length===0 ? <div className="rounded-2xl border border-dashed border-border p-12 text-center"><h2 className="font-display text-xl font-bold">No listings yet</h2><p className="mt-2 text-sm text-muted-foreground">Be the first to put some gear up for grabs.</p><Link to="/sell" className="mt-4 inline-block text-sm font-bold text-orange-500">Create a listing →</Link></div> :
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item:any)=><article key={item.id} className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-2"><span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-500">{item.category}</span><span className="text-xs text-muted-foreground">{item.condition}</span></div>
        <h2 className="font-display text-lg font-bold">{item.title}</h2><p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{item.description}</p>
        <div className="mt-4 flex items-center justify-between gap-3"><strong>{item.price_nzd==null?"Swap / offers":nzd(Number(item.price_nzd))}</strong><span className="text-xs text-muted-foreground">{item.location||"NZ"}</span></div>
        <p className="mt-3 text-xs text-muted-foreground">Listed by {item.display_name||"Community member"}</p>
        <p className="mt-2 text-[11px] text-muted-foreground">Listing reference: {item.id.slice(0,8)}</p>
      </article>)}</div>}
    </section>
  </AppShell>;
}
