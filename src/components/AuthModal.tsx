import { Link } from "@tanstack/react-router";
import { BrandedGoogleSignIn } from "@/components/branded-google-sign-in";
import { cn } from "@/lib/utils";

/**
 * Sign-in popup: Looters ↔ Siftah logo fade, then native Google OAuth.
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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full max-w-[420px] space-y-3",
          "shadow-[0_25px_80px_-12px_rgba(0,0,0,0.7)]",
        )}
      >
        <BrandedGoogleSignIn callbackURL={callbackURL} />

        <div className="rounded-2xl border border-white/10 bg-[#1a1228]/95 px-4 py-3 space-y-2">
          <Link
            to="/login"
            search={{ callbackURL }}
            onClick={onClose}
            className="block w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/10"
          >
            Use email instead · Proton Mail supported
          </Link>
          <p className="text-center text-[11px] text-white/50">
            PayPal is only needed later when you’re ready to list or deal.
          </p>
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
