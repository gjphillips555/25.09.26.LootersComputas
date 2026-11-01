import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { authEnabled } from "@/lib/auth/client";
import { BrandLogo } from "@/components/brand-logo";
import { GoogleSignIn } from "@/components/google-sign-in";
import { KeyLink } from "@/components/key-button";
import { LegalLinks } from "@/components/legal-links";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [callbackURL, setCallbackURL] = useState("/");
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("callbackURL");
    if (requested === "/siftah") setCallbackURL("/siftah");
  }, []);
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-6">
        <Link to="/" className="flex justify-center">
          <BrandLogo className="h-16 w-auto max-w-[280px] object-contain" />
        </Link>
        <h1 className="text-center font-display text-xl font-semibold">
          Sign in
        </h1>
        <p className="text-center text-sm text-muted-foreground">
          Google is optional. Agree to the Terms, then use Google to save your
          name and email, or carry on as a guest to shop and pay.
        </p>
        {authEnabled ? (
          <GoogleSignIn callbackURL={callbackURL} />
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Sign-in is disabled.
          </p>
        )}
        <KeyLink to="/" size="default">
          Continue as guest
        </KeyLink>
        <LegalLinks className="pt-2" />
      </div>
    </main>
  );
}
