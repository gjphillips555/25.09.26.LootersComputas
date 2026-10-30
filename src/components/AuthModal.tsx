import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ARTWORK } from "@/lib/artwork";
import { authEnabled, signIn } from "@/lib/auth/client";
import { hasAgreedTerms, setAgreedTerms } from "@/lib/terms-agree";
import { GoogleMark } from "@/components/google-mark";
import { cn } from "@/lib/utils";

/**
 * Modern, fun sign-up / sign-in popup.
 * Looters branding + PayPal graphics + Google.
 */
export function AuthModal({
  open,
  onClose,
  callbackURL = "/account",
}: {
  open: boolean;
  onClose: () => void;
  callbackURL?: string;
}) {
  const [agreed, setAgreed] = useState(() => hasAgreedTerms());
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function startGoogle() {
    if (!agreed) {
      toast.error("Please agree to the Terms first.");
      return;
    }
    setAgreedTerms();
    setBusy(true);
    try {
      await signIn("grok-google", { callbackURL });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign-in failed";
      toast.error(msg);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full max-w-[420px] overflow-hidden rounded-2xl",
          "border border-white/10 bg-gradient-to-b from-[#2a1f3d] to-[#1a1228]",
          "shadow-[0_25px_80px_-12px_rgba(0,0,0,0.7)]",
        )}
      >
        {/* Fun top banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-amber-400 to-purple-600 px-6 pb-8 pt-6">
          <div className="absolute -right-6 -top-6 size-28 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-4 bottom-0 size-20 rounded-full bg-purple-800/40 blur-xl" />

          <div className="relative flex flex-col items-center gap-3">
            <img
              src={ARTWORK.logoOrange}
              alt="Looters Computas"
              className="h-14 w-auto drop-shadow-lg"
            />
            <p className="text-center text-sm font-medium text-white/95">
              Join the loot — buy, sell & swap PC parts
            </p>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="text-center">
            <h2 className="font-display text-xl font-bold tracking-tight text-white">
              Sign in / Sign up
            </h2>
            <p className="mt-1.5 text-sm text-white/60">
              Quick Google login. PayPal is only needed when you’re ready to deal.
            </p>
          </div>

          {/* Terms checkbox */}
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
                to="/terms"
                className="font-medium text-orange-400 underline-offset-2 hover:underline"
                onClick={onClose}
              >
                Terms
              </Link>{" "}
              &{" "}
              <Link
                to="/storepolicy"
                className="font-medium text-orange-400 underline-offset-2 hover:underline"
                onClick={onClose}
              >
                Store Policy
              </Link>
              . We never handle your money.
            </span>
          </label>

          {/* Google button */}
          {authEnabled ? (
            <button
              type="button"
              disabled={busy || !agreed}
              onClick={() => void startGoogle()}
              className={cn(
                "flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3.5",
                "bg-white text-[#1f1f1f] font-semibold text-[15px]",
                "shadow-lg transition hover:bg-gray-100",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <GoogleMark className="size-5" />
              {busy ? "Connecting…" : "Continue with Google"}
            </button>
          ) : (
            <p className="text-center text-sm text-white/50">Sign-in is currently disabled.</p>
          )}

          {/* PayPal note with graphics */}
          <div className="rounded-xl border border-[#0070ba]/30 bg-[#003087]/20 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0070ba]">
                <span className="text-lg font-bold text-white">P</span>
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-medium text-[#ffc439]">PayPal required for deals</p>
                <p className="text-[11px] leading-snug text-white/55">
                  After Google sign-in you’ll connect PayPal once (official Log in with PayPal).
                  Only then can you list or make offers / swaps.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full text-center text-sm text-white/45 hover:text-white/70"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
