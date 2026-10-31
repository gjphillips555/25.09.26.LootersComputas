import { createFileRoute, Link } from "@tanstack/react-router";
import { authEnabled } from "@/lib/auth/client";
import { BrandLogo } from "@/components/brand-logo";
import { GoogleSignIn } from "@/components/google-sign-in";
import { LegalLinks } from "@/components/legal-links";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-6">
        <Link to="/" className="flex justify-center">
          <BrandLogo className="h-16 w-auto max-w-[280px] object-contain" />
        </Link>
        <h1 className="text-center font-display text-xl font-semibold">Sign into LootersComputas</h1>
        <p className="text-center text-sm text-muted-foreground">
          Use your Google account to join the LootersComputas community. One account gives you access to the forum and marketplace.
        </p>
        {authEnabled ? (
          <GoogleSignIn callbackURL="/" label="Sign into LootersComputas with Google" />
        ) : (
          <p className="text-center text-sm text-muted-foreground">Google sign-in is currently disabled.</p>
        )}
        <LegalLinks className="pt-2" />
      </div>
    </main>
  );
}
