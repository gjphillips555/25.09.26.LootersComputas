import { useState, useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";
import { GoogleSignIn } from "@/components/google-sign-in";
import { ARTWORK } from "@/lib/artwork";
import { authEnabled, signOut } from "@/lib/auth/client";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const subscribeToNothing = () => () => {};
const noGateSessionOnServer = () => false;

export function AccountButton({ showF8 = false }: { showF8?: boolean }) {
  const { user, isPending } = useCurrentUserState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const gateSession = useSyncExternalStore(
    subscribeToNothing,
    hasGateSessionMarker,
    noGateSessionOnServer,
  );

  if (isPending) {
    return (
      <div
        className="size-10 shrink-0 animate-pulse rounded-full bg-secondary"
        aria-hidden="true"
      />
    );
  }

  // Guest: washed-out penguin mugshot + Sign Up menu
  if (!user) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Sign up or sign in"
          className="relative size-10 shrink-0 overflow-hidden rounded-full border border-border bg-secondary ring-offset-background transition hover:ring-2 hover:ring-[#ff9a00]/50"
        >
          <img
            src={ARTWORK.guestAvatar}
            alt=""
            className="size-full object-cover opacity-45 grayscale"
            width={40}
            height={40}
          />
        </button>
        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Close"
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 z-50 mt-2 w-64 space-y-3 rounded-xl border border-border bg-card p-3 shadow-xl">
              <div className="flex items-center gap-3">
                <img
                  src={ARTWORK.guestAvatar}
                  alt=""
                  className="size-11 rounded-full border border-border object-cover opacity-50 grayscale"
                  width={44}
                  height={44}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Guest</p>
                  <p className="text-xs text-muted-foreground">
                    Not yet a member?
                  </p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Sign up free to list gear, message sellers, and connect PayPal.
              </p>
              <GoogleSignIn
                compact={false}
                showF8={showF8}
                callbackURL="/"
                label="Sign Up with Google"
                size="sm"
                tone="orange"
              />
              <p className="text-center text-[11px] text-muted-foreground">
                Already have an account? Same button signs you in.
              </p>
              <Link
                to="/login"
                className="block text-center text-xs font-medium text-[#ff9a00] hover:underline"
                onClick={() => setMenuOpen(false)}
              >
                More sign-in options
              </Link>
            </div>
          </>
        )}
      </div>
    );
  }

  const label = user.displayName ?? user.primaryEmail ?? "Account";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={`${label} account`}
        className="size-10 shrink-0 overflow-hidden rounded-full border border-border bg-secondary ring-offset-background transition hover:ring-2 hover:ring-[#ff9a00]/50"
      >
        {user.profileImageUrl ? (
          <img
            src={user.profileImageUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <img
            src={ARTWORK.guestAvatar}
            alt=""
            className="size-full object-cover opacity-80"
          />
        )}
      </button>
      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close account menu"
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-border bg-card p-3 shadow-xl">
            <div className="mb-2 flex items-center gap-2">
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt=""
                  className="size-9 rounded-full object-cover"
                />
              ) : (
                <img
                  src={ARTWORK.guestAvatar}
                  alt=""
                  className="size-9 rounded-full object-cover opacity-80"
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{label}</p>
                {user.primaryEmail && (
                  <p className="truncate text-xs text-muted-foreground">
                    {user.primaryEmail}
                  </p>
                )}
              </div>
            </div>
            <Link
              to="/account"
              className="mt-1 flex h-9 w-full items-center justify-center rounded-md border border-border text-sm hover:bg-secondary"
              onClick={() => setMenuOpen(false)}
            >
              Account & Wallet
            </Link>
            {authEnabled && !gateSession && (
              <button
                type="button"
                disabled={signingOut}
                onClick={() => {
                  setSigningOut(true);
                  void signOut().catch(() => setSigningOut(false));
                }}
                className="mt-2 h-9 w-full rounded-md border border-border text-sm hover:bg-secondary disabled:opacity-60"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
