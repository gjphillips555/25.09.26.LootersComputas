import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { AuthModal } from "@/components/AuthModal";
import {
  getMyProfile,
  isPayPalConnected,
  type ProfileRow,
} from "@/lib/marketplace/profile";
import { ARTWORK } from "@/lib/artwork";
import { createListing } from "@/lib/marketplace/listings";

export const Route = createFileRoute("/sell")({
  component: SellPage,
});

const CATEGORIES = [
  "Desktops",
  "Laptops",
  "Components",
  "Monitors",
  "Cables & Plugs",
  "Batteries",
  "Ink",
  "Other",
];

const CONDITIONS = ["New", "Excellent", "Good", "Fair", "For parts"];

function SellPage() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state (basic for now — full create server fn comes next)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [condition, setCondition] = useState(CONDITIONS[1]);
  const [price, setPrice] = useState("");
  const [acceptsSwaps, setAcceptsSwaps] = useState(true);
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    void getMyProfile().then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, [user?.id]);

  const canSell = isPayPalConnected(profile);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSell) {
      toast.error("Connect PayPal on your Account page before listing.");
      navigate({ to: "/account" });
      return;
    }
    // Placeholder — full createListing server function lands in the next pass
    toast.message("Listing form ready — full save coming in the next update.", {
      description: "Schema + PayPal gate are already live.",
    });
  }

  return (
    <main className="mx-auto min-h-dvh max-w-xl px-4 py-10">
      <div className="mb-8 flex items-center gap-4">
        <Link to="/">
          <img src={ARTWORK.logoOrange} alt="Looters" className="h-10 w-auto" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold">Sell / List an item</h1>
          <p className="text-sm text-muted-foreground">Fixed price or open to swaps</p>
        </div>
      </div>

      <SignedOut>
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="mb-4 text-muted-foreground">Sign in to create a listing.</p>
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"
          >
            Sign in / Sign up
          </button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} callbackURL="/sell" />
      </SignedOut>

      <SignedIn>
        {loading ? (
          <p className="text-muted-foreground">Checking your account…</p>
        ) : !canSell ? (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-6 text-center">
            <p className="mb-2 font-medium text-amber-300">PayPal required</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Connect your PayPal account before you can list items or make deals.
            </p>
            <Link
              to="/account"
              className="inline-flex rounded-xl bg-[#0070ba] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#005ea6]"
            >
              Go to Account → Connect PayPal
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Title</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. RTX 3060 12GB — excellent condition"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Description</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell buyers the details, any flaws, what’s included…"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Condition</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Price (NZD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Leave blank for offers only"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Location</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Upper Hutt"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={acceptsSwaps}
                onChange={(e) => setAcceptsSwaps(e.target.checked)}
                className="size-4 accent-orange-500"
              />
              Accept swap / trade offers
            </label>

            <p className="text-xs text-muted-foreground">
              Listings are published immediately and can be browsed in the community marketplace. Photos and messaging are not enabled yet.
            </p>

            <button
              type="submit"
              className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white hover:bg-orange-600"
            >
              Publish listing
            </button>
          </form>
        )}
      </SignedIn>
    </main>
  );
}
