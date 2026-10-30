import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/")({ component: Home });

const categories = [
  ["01", "PC parts", "GPUs, CPUs, memory & the bits in between"],
  ["02", "Computers", "Desktops, laptops and complete builds"],
  ["03", "Screens & gear", "Monitors, keyboards, mice and audio"],
  ["04", "Cables & oddities", "Adapters, spares and useful leftovers"],
];

function PenguinMark() {
  return (
    <svg viewBox="0 0 260 290" role="img" aria-label="Looters penguin carrying a parcel" className="lc-penguin">
      <ellipse cx="130" cy="265" rx="83" ry="12" fill="#17121f" opacity=".16" />
      <path d="M52 112C52 48 91 15 132 15c46 0 79 37 79 97v91c0 34-34 57-81 57-48 0-80-23-80-57z" fill="#20152e" stroke="#111" strokeWidth="8" />
      <path d="M77 120c0-49 22-79 55-79s55 30 55 79v72c0 28-22 43-55 43s-55-15-55-43z" fill="#fff8ec" />
      <path d="M83 91c-27-19-46-8-48 13-2 20 13 42 33 48" fill="#20152e" stroke="#111" strokeWidth="8" strokeLinecap="round" />
      <path d="M177 91c27-19 46-8 48 13 2 20-13 42-33 48" fill="#20152e" stroke="#111" strokeWidth="8" strokeLinecap="round" />
      <ellipse cx="108" cy="102" rx="7" ry="10" fill="#17121f" />
      <ellipse cx="151" cy="102" rx="7" ry="10" fill="#17121f" />
      <path d="m113 122 17 13 18-13-18 3z" fill="#ff8b22" stroke="#111" strokeWidth="4" strokeLinejoin="round" />
      <path d="M104 229 83 258c-6 9 2 15 13 12l34-10 35 10c12 3 18-4 11-13l-22-28" fill="#ff8b22" stroke="#111" strokeWidth="7" strokeLinejoin="round" />
      <g transform="rotate(-7 130 183)">
        <rect x="88" y="151" width="86" height="65" rx="7" fill="#ff8b22" stroke="#111" strokeWidth="7" />
        <path d="M130 152v63M89 177h84" stroke="#fff0d7" strokeWidth="6" />
        <path d="m111 151 19 17 18-17" fill="none" stroke="#111" strokeWidth="5" strokeLinejoin="round" />
      </g>
      <path d="M28 60c12-15 27-21 43-18M209 42c13 4 22 12 27 24" fill="none" stroke="#8a55e8" strokeWidth="7" strokeLinecap="round" />
      <path d="m24 46 7 15 13-10M231 76l5-15 14 9" fill="none" stroke="#8a55e8" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Home() {
  return (
    <AppShell>
      <div className="lc-home">
        <div className="lc-topline">
          <span><i /> INDEPENDENT NZ MARKETPLACE</span>
          <span className="lc-topline-right">GOOD GEAR FINDS A NEW HOME <b>↗</b></span>
        </div>

        <section className="lc-hero">
          <div className="lc-hero-copy">
            <p className="lc-eyebrow">THE INTERNET'S BACK ROOM FOR GOOD STUFF</p>
            <h1>Find it.<br /><em>Flip it.</em><br />Pass it on.</h1>
            <p className="lc-intro">A place for people who know the value of a good find. Buy, sell, swap or trade tech and the useful bits that deserve another run.</p>
            <div className="lc-actions">
              <Link to="/sell" className="lc-button lc-button-orange">Put something up <span>↗</span></Link>
              <Link to="/account" className="lc-button lc-button-outline">Your account <span>→</span></Link>
            </div>
            <div className="lc-handnote"><span>NO BIG-BOX ENERGY.</span> Just people making good deals.</div>
          </div>
          <div className="lc-hero-art">
            <div className="lc-art-stamp">LOOT<br />NO. 001</div>
            <div className="lc-art-ring" />
            <PenguinMark />
            <div className="lc-art-caption"><b>THE LOOTER</b><span>Parcel secured. Deal pending.</span></div>
            <div className="lc-scribble">nice find!</div>
          </div>
          <div className="lc-hero-side">EST. FOR THE CURIOUS <span>✳</span> BUILT TO BE TRADED</div>
        </section>

        <div className="lc-strip">
          <span>BUY</span><b>✳</b><span>SELL</span><b>✳</b><span>SWAP</span><b>✳</b><span>TRADE</span><b>✳</b><span>REPEAT</span>
        </div>

        <section className="lc-section lc-category-section">
          <div className="lc-section-heading">
            <div><p className="lc-eyebrow">THE GOOD STUFF</p><h2>What are you<br className="lc-mobile-break" /> hunting for?</h2></div>
            <p>From a tidy graphics card to that one cable you've been chasing for six months.</p>
          </div>
          <div className="lc-category-grid">
            {categories.map(([number, name, description]) => (
              <Link key={number} to="/sell" className="lc-category">
                <span className="lc-category-number">{number}</span>
                <span className="lc-category-arrow">↗</span>
                <strong>{name}</strong>
                <small>{description}</small>
              </Link>
            ))}
          </div>
          <p className="lc-category-footnote">Got something outside these shelves? List it anyway. The interesting stuff rarely fits in a box.</p>
        </section>

        <section className="lc-deal-panel">
          <div className="lc-deal-number">A BETTER WAY TO DEAL / 01</div>
          <div className="lc-deal-copy">
            <p className="lc-eyebrow">NOT JUST A BUY BUTTON</p>
            <h2>Cash is good.<br /><em>A clever swap is better.</em></h2>
            <p>See something you like? Make an offer. Put forward a trade, add a little cash, or agree a straight swap. The best deals start with a conversation.</p>
            <Link to="/inbox" className="lc-text-link">Head to your inbox <span>↗</span></Link>
          </div>
          <div className="lc-deal-stamps">
            <div className="lc-stamp"><span>TRADE</span><b>↔</b><small>YOUR WAY</small></div>
            <div className="lc-stamp lc-stamp-orange"><span>FAIR</span><b>◎</b><small>GOES BOTH WAYS</small></div>
          </div>
        </section>

        <section className="lc-trust-row">
          <div><span className="lc-trust-icon">01</span><strong>Real people</strong><small>Deals between members, not faceless warehouses.</small></div>
          <div><span className="lc-trust-icon">02</span><strong>PayPal connected</strong><small>Connect your PayPal when you're ready to deal.</small></div>
          <div><span className="lc-trust-icon">03</span><strong>Reputation matters</strong><small>Build trust through clear communication and feedback.</small></div>
        </section>

        <section className="lc-bottom-cta">
          <div><p className="lc-eyebrow">YOUR DRAWER OF RANDOM GOODIES IS CALLING</p><h2>Got a good one?</h2><p>Give it a second life. Someone's been looking for it.</p></div>
          <Link to="/sell" className="lc-button lc-button-dark">List your first find <span>↗</span></Link>
        </section>

        <footer className="lc-home-footer">
          <BrandLogo className="h-12 w-auto max-w-[170px] object-contain" />
          <span>BUY. SELL. SWAP. TRADE.</span>
          <Link to="/terms">Marketplace terms ↗</Link>
        </footer>
      </div>
    </AppShell>
  );
}
