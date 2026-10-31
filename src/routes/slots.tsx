import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/slots")({ component: SlotsPage });

const games = [
  { name: "Heart of Vegas", description: "Free-to-play social slots from Product Madness, an Aristocrat company.", url: "https://www.productmadness.com/games/" },
  { name: "Cashman Casino", description: "A free-to-play social casino featuring a range of slot titles.", url: "https://www.productmadness.com/games/" },
  { name: "Lightning Link Casino", description: "Aristocrat-inspired social slots and missions.", url: "https://www.productmadness.com/games/" },
];

function SlotsPage() {
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  return <AppShell><div className="mx-auto max-w-4xl py-10">
    <p className="text-xs font-bold uppercase tracking-[.2em] text-orange-500">Looters arcade</p>
    <h1 className="mt-2 text-4xl font-black">Slots &amp; Games</h1>
    <p className="mt-3 max-w-2xl text-muted-foreground">A games lounge for members. We’ll add properly licensed game integrations if a provider makes that possible.</p>
    {!ageConfirmed ? <section className="mt-8 rounded-2xl border border-orange-500/40 bg-card p-7"><p className="text-lg font-bold">18+ age confirmation</p><p className="mt-2 text-sm text-muted-foreground">The third-party social casino titles linked from this page contain simulated gambling content and are intended for adults. They do not offer real-money gambling or real-money prizes. By continuing, you confirm you are 18 or older.</p><button onClick={() => setAgeConfirmed(true)} className="mt-5 rounded-xl bg-orange-500 px-6 py-3 font-bold text-white">I’m 18 or older — continue</button></section> : <>
      <section className="mt-8 rounded-2xl border border-border bg-card p-6"><h2 className="text-xl font-bold">Official free-to-play social casino games</h2><p className="mt-2 text-sm text-muted-foreground">These open the publisher’s official game catalogue. LootersComputas does not host, copy or embed their games, and availability depends on your device and region.</p><div className="mt-5 grid gap-4 sm:grid-cols-3">{games.map(game=><article key={game.name} className="rounded-xl border border-border bg-secondary/30 p-4"><p className="text-lg font-bold">{game.name}</p><p className="mt-2 min-h-16 text-sm text-muted-foreground">{game.description}</p><a href={game.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white">Visit official games ↗</a></article>)}</div><p className="mt-5 text-xs text-muted-foreground">Publisher: Product Madness / Aristocrat. Third-party games may have their own age checks, terms, in-app purchases and regional restrictions.</p></section>
      <section className="mt-6 rounded-2xl border border-border bg-card p-6"><h2 className="text-lg font-bold">Loot Points stay separate</h2><p className="mt-2 text-sm text-muted-foreground">Playing games here or on third-party sites will not award, spend or change your Loot Points. Points are earned through community participation only.</p><Link to="/loot-points" className="mt-4 inline-flex text-sm font-bold text-orange-500">View Loot Points →</Link></section>
      </>}
    <p className="mt-8 text-xs text-muted-foreground">LootersComputas is not affiliated with Aristocrat or Product Madness. Their names and game titles belong to their respective owners.</p>
  </div></AppShell>;
}
