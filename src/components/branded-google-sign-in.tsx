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
        "bg-[#0a0a0c]",
        "shadow-[0_20px_60px_-16px_rgba(0,0,0,0.55)]",
        className,
      )}
    >
      <div className="relative bg-black px-6 pb-6 pt-8">
        <BrandLogoCrossfade heightClass="h-28 sm:h-32" />
      </div>

      <div className="space-y-4 border-t border-white/10 px-5 py-5 sm:px-6">
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
            . I confirm I am 18 or older.
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
        ) : null}
      </div>
    </div>
  );
}
