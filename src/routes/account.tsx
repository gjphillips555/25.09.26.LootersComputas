import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { AuthModal } from "@/components/AuthModal";
import { ConnectPayPalButton } from "@/components/ConnectPayPalButton";
import {
  ensureProfile,
  getMyProfile,
  isPayPalConnected,
  type ProfileRow,
} from "@/lib/marketplace/profile";
import { ARTWORK } from "@/lib/artwork";
import { SiftahCreditsWallet } from "@/components/siftah-credits-wallet";

export type AccountSearch = {
  paypal?: "connected" | "error" | string;
};

export const Route = createFileRoute("/account")({
  component: AccountPage,
  validateSearch: (s: Record<string, unknown>): AccountSearch => ({
    paypal: typeof s.paypal === "string" ? s.paypal : undefined,
  }),
});

function AccountPage() {
  const { user, isPending: isLoading } = useCurrentUserState();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const search = Route.useSearch();

  useEffect(() => {
    if (search.paypal === "connected") {
      toast.success("PayPal connected — you can now list and deal!");
    } else if (search.paypal === "error") {
      toast.error("PayPal connection failed. Please try again.");
    }
  }, [search.paypal]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      await ensureProfile();
      const p = await getMyProfile();
      setProfile(p);
    })();
  }, [user?.id]);

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-center gap-4">
        <Link to="/">
          <img src={ARTWORK.logoOrange} alt="Looters" className="h-12 w-auto" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold">Your Account</h1>
          <p className="text-sm text-muted-foreground">
            Manage profile & payment methods
          </p>
        </div>
      </div>

      <SignedOut>
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="mb-4 text-muted-foreground">
            Sign in with Google or email (including Proton Mail) to manage your marketplace account.
          </p>
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"
          >
            Sign in / Sign up
          </button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </SignedOut>

      <SignedIn>
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-4 font-display text-lg font-semibold">Profile</h2>
              <div className="flex items-center gap-4">
                {user?.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt=""
                    className="size-14 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="flex size-14 items-center justify-center rounded-full bg-primary/20 text-xl font-bold text-primary">
                    {(user?.displayName || user?.primaryEmail || "?")[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium">{user?.displayName || "Looter"}</p>
                  <p className="text-sm text-muted-foreground">{user?.primaryEmail}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Username, avatar and Siftah Message settings live in the messenger.
              </p>
              <Link
                to="/siftah-message"
                className="mt-3 inline-flex rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-500"
              >
                Open Siftah Message
              </Link>
            </section>

            <SiftahCreditsWallet />

            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-1 font-display text-lg font-semibold">Payment methods</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Connect PayPal to create listings and make buy / swap offers.
                We never handle your money — deals stay between you and the other looter.
              </p>
              <ConnectPayPalButton
                profile={profile}
                onConnected={() => void getMyProfile().then(setProfile)}
              />
            </section>

            <section className="flex flex-wrap gap-3">
              {isPayPalConnected(profile) ? (
                <Link
                  to="/sell"
                  className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
                >
                  Create a listing
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-xl bg-muted px-5 py-2.5 text-sm font-semibold text-muted-foreground"
                  title="Connect PayPal first"
                >
                  Create a listing (connect PayPal first)
                </button>
              )}
              <Link
                to="/siftah"
                className="rounded-xl border border-border bg-secondary px-5 py-2.5 text-sm font-semibold hover:bg-secondary/80"
              >
                Siftah Mobile
              </Link>
              <Link
                to="/"
                className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Back to shop
              </Link>
            </section>
          </div>
        )}
      </SignedIn>
    </main>
  );
}
