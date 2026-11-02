import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { BrandLogoCrossfade } from "@/components/brand-logo-crossfade";
import { GoogleMark } from "@/components/google-mark";
import { authEnabled, signIn } from "@/lib/auth/client";
import { hasAgreedTerms, setAgreedTerms } from "@/lib/terms-agree";
import { cn } from "@/lib/utils";

/**
 * Branded pre-Google gate shown on our domain.
 * Google's own consent screen cannot show custom logos — this is the popup
 * users see first, then they continue to real Google OAuth (native provider).
 */
export function BrandedGoogleSignIn({
  callbackURL = "/",
  className,
}: {
  callbackURL?: string;
  className?: string;
}) {
  const [agreed, setAgreed] = useState(() => hasAgreedTerms());
  const [busy, setBusy] = useState(false);

  if (!authEnabled) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Sign-in is currently disabled.
      </p>
    );
  }

  async function start() {
    if (!agreed) {
      toast.error("Please agree to the Terms first.");
      return;
    }
    setAgreedTerms();
    setBusy(true);
    try {
      await signIn("google", { callbackURL });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      toast.error(msg);
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10",
        "bg-gradient-to-b from-[#2a1f3d] to-[#12101a]",
        "shadow-[0_20px_60px_-16px_rgba(0,0,0,0.55)]",
        className,
      )}
    >
      <div className="relative bg-gradient-to-r from-orange-500 via-amber-400 to-red-600 px-6 pb-8 pt-7">
        <div className="absolute -right-8 -top-8 size-32 rounded-full bg-white/15 blur-2xl" />
        <div className="absolute -left-6 bottom-0 size-24 rounded-full bg-black/20 blur-xl" />
        <div className="relative space-y-3 text-center">
          <BrandLogoCrossfade heightClass="h-14 sm:h-16" />
          <p className="text-sm font-medium text-white/95">
            One account for Looters Computas & Siftah Mobile
          </p>
        </div>
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-6">
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-xs leading-snug text-white/70">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => {
              setAgreed(e.target.checked);
              if (e.target.checked) setAgreedTerms();
            }}
            className="mt-0.5 size-3.5 shrink-0 accent-orange-500"
          />
          <span>
            I agree to the{" "}
            <Link
              to="/termsandconditions"
              className="font-medium text-orange-400 underline-offset-2 hover:underline"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              to="/storepolicy"
              className="font-medium text-orange-400 underline-offset-2 hover:underline"
            >
              Store Policy
            </Link>
            .
          </span>
        </label>

        <button
          type="button"
          disabled={busy || !agreed}
          onClick={() => void start()}
          className={cn(
            "flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3.5",
            "bg-white text-[#1f1f1f] text-[15px] font-semibold",
            "shadow-lg transition hover:bg-gray-100",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <GoogleMark className="size-5" />
          {busy ? "Opening Google…" : "Continue with Google"}
        </button>

        {!agreed ? (
          <p className="text-center text-[11px] text-white/45">
            Tick the box to enable Google sign-in.
          </p>
        ) : (
          <p className="text-center text-[11px] text-white/45">
            You’ll use the same login on the marketplace and Siftah.
          </p>
        )}
      </div>
    </div>
  );
}
