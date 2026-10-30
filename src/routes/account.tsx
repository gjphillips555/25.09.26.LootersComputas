import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/auth/use-current-user";
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

export const Route = createFileRoute("/account")({
  component: AccountPage,
  validateSearch: (s: Record<string, unknown>) => ({
    paypal: typeof s.paypal === "string" ? s.paypal : undefined,
  }),
});

function AccountPage() {
  const { user, isLoading } = useCurrentUser();
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
            Sign in with Google to manage your marketplace account.
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
            {/* Profile card */}
            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-4 font-display text-lg font-semibold">Profile</h2>
              <div className="flex items-center gap-4">
                {user?.image ? (
                  <img
                    src={user.image}
                    alt=""
                    className="size-14 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="flex size-14 items-center justify-center rounded-full bg-primary/20 text-xl font-bold text-primary">
                    {(user?.name || user?.email || "?")[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium">{user?.name || "Looter"}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
            </section>

            {/* PayPal gate */}
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

            {/* Actions */}
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
                to="/inbox"
                className="rounded-xl border border-border bg-secondary px-5 py-2.5 text-sm font-semibold hover:bg-secondary/80"
              >
                Inbox
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
