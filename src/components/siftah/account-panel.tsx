import { useState, useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { GoogleSignIn } from "@/components/google-sign-in";
import { authEnabled, signOut } from "@/lib/auth/client";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { UserAvatar } from "./user-avatar";

const subscribeToNothing = () => () => {};
const noGateSessionOnServer = () => false;

/**
 * Sign-in / sign-out card for the app menu. Uses the site's existing
 * Better Auth Google sign-in (GoogleSignIn → signIn("google") →
 * /api/auth/sign-in/social), so no new OAuth client is involved.
 */
export function AccountPanel({ onNavigate, callbackURL = "/" }: { onNavigate?: () => void; callbackURL?: string }) {
  const { user, isPending } = useCurrentUserState();
  const [signingOut, setSigningOut] = useState(false);
  const gateSession = useSyncExternalStore(subscribeToNothing, hasGateSessionMarker, noGateSessionOnServer);

  if (isPending) {
    return <div className="h-24 animate-pulse rounded-2xl bg-white/5" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-3 flex items-center gap-3">
          <UserAvatar user={null} className="size-11" />
          <div className="min-w-0">
            <p className="font-display text-base text-white">Welcome, guest</p>
            <p className="text-xs text-white/60">Sign in to sell, message, play and save plates.</p>
          </div>
        </div>
        <div className="[&_label]:text-white/70">
          <GoogleSignIn callbackURL={callbackURL} label="Sign in with Google" size="sm" tone="white" />
        </div>
        <Link
          to="/login"
          onClick={onNavigate}
          className="mt-3 block text-center text-xs font-semibold text-[#5cc8f2] hover:underline"
        >
          More sign-in options
        </Link>
      </div>
    );
  }

  const name = user.displayName ?? user.primaryEmail ?? "Member";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <UserAvatar user={user} className="size-12 ring-2 ring-[#e3121b]" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base text-white">{name}</p>
        {user.primaryEmail && <p className="truncate text-xs text-white/60">{user.primaryEmail}</p>}
        <Link to="/account" onClick={onNavigate} className="text-xs font-semibold text-[#5cc8f2] hover:underline">
          Account &amp; wallet
        </Link>
      </div>
      {authEnabled && !gateSession && (
        <button
          type="button"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOut().catch(() => setSigningOut(false));
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 disabled:opacity-60"
        >
          <LogOut className="size-3.5" />
          {signingOut ? "…" : "Sign out"}
        </button>
      )}
    </div>
  );
}
