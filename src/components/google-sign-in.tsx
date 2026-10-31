import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { GoogleMark } from "@/components/google-mark";
import { KeyButton } from "@/components/key-button";
import { authEnabled, signIn } from "@/lib/auth/client";
import { hasAgreedTerms, setAgreedTerms } from "@/lib/terms-agree";
import { cn } from "@/lib/utils";

export function GoogleSignIn({
  callbackURL = "/",
  compact = false,
  showF8 = false,
  label = "Sign into LootersComputas with Google",
  size = "default",
  tone,
}: {
  callbackURL?: string;
  compact?: boolean;
  showF8?: boolean;
  label?: string;
  size?: "default" | "sm" | "fit";
  tone?: "gray" | "cream" | "teal" | "orange" | "brown" | "white";
}) {
  const [agreed, setAgreed] = useState(() => hasAgreedTerms());
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  if (!authEnabled) return null;

  async function start() {
    if (!agreed) {
      toast.error("Please agree to the Terms and Conditions to sign in.");
      setOpen(true);
      return;
    }
    setAgreedTerms();
    setBusy(true);
    try {
      await signIn("google", { callbackURL });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Google sign-in failed";
      toast.error(msg, {
        description:
          "Google sign-in must be configured for this website in its Google Cloud OAuth settings.",
      });
    } finally {
      setBusy(false);
    }
  }

  const box = (
    <label className="flex cursor-pointer items-start gap-2 text-left text-xs leading-snug text-muted-foreground">
      <input
        type="checkbox"
        checked={agreed}
        onChange={(e) => {
          setAgreed(e.target.checked);
          if (e.target.checked) setAgreedTerms();
        }}
        className="mt-0.5 size-3.5 shrink-0 accent-[#5ea8a0]"
      />
      <span>
        I agree to the{" "}
        <Link
          to="/termsandconditions"
          className="font-medium text-[#ff9a00] underline-offset-2 hover:underline"
        >
          Terms and Conditions
        </Link>{" "}
        and{" "}
        <Link
          to="/storepolicy"
          className="font-medium text-[#ff9a00] underline-offset-2 hover:underline"
        >
          Store Policy
        </Link>
        .
      </span>
    </label>
  );

  if (compact) {
    return (
      <div className="relative">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (agreed) void start();
            else setOpen((v) => !v);
          }}
          aria-label="Sign into LootersComputas with Google"
          className="kb-key kb-key-sm kb-white disabled:opacity-60"
        >
          <span className="kb-cap">
            {showF8 ? (
              <span className="kb-dual">
                <b>F8</b>
                <i>
                  <GoogleMark className="size-4" />
                </i>
              </span>
            ) : (
              <GoogleMark className="size-5" />
            )}
          </span>
        </button>
        {open ? (
          <>
            <button
              type="button"
              aria-label="Close sign-in"
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <div className="absolute right-0 z-50 mt-2 w-64 space-y-3 rounded-xl border border-border bg-card p-3 shadow-xl">
              <p className="text-sm font-medium">Sign into LootersComputas</p>
              {box}
              <KeyButton
                size="sm"
                tone="teal"
                className="w-full"
                disabled={busy || !agreed}
                onClick={() => void start()}
              >
                <GoogleMark className="size-3.5" />
                {busy ? "Connecting…" : "Sign into LootersComputas"}
              </KeyButton>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {box}
      <KeyButton
        disabled={busy || !agreed}
        size={size}
        tone={tone}
        className="w-full"
        onClick={() => void start()}
      >
        <GoogleMark className={size === "sm" ? "size-3.5" : "size-5"} />
        {busy ? "Connecting…" : label}
      </KeyButton>
      {!agreed ? (
        <p className={cn("text-center text-[11px] text-muted-foreground")}>
          Tick the box to enable Google sign-in.
        </p>
      ) : null}
    </div>
  );
}
