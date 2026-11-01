import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { authEnabled, authClient } from "@/lib/auth/client";
import { BrandLogo } from "@/components/brand-logo";
import { GoogleSignIn } from "@/components/google-sign-in";
import { KeyLink } from "@/components/key-button";
import { LegalLinks } from "@/components/legal-links";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [callbackURL, setCallbackURL] = useState("/");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("callbackURL");
    if (requested === "/siftah" || requested === "/admin") setCallbackURL(requested);
  }, []);

  async function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = isSignUp
        ? await authClient.signUp.email({ name: name.trim() || email.split("@")[0], email: email.trim(), password, callbackURL })
        : await authClient.signIn.email({ email: email.trim(), password, callbackURL });
      if (result.error) throw new Error(result.error.message || "Email sign-in failed.");
      window.location.href = callbackURL;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4 sm:p-6">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <Link to="/" className="flex justify-center"><BrandLogo className="h-16 w-auto max-w-[280px] object-contain" /></Link>
        <h1 className="text-center font-display text-xl font-semibold">{isSignUp ? "Create your account" : "Sign in"}</h1>
        <p className="text-center text-sm text-muted-foreground">Use Google or any email address, including Proton Mail. Your email provider does not need a separate integration.</p>
        {authEnabled ? (
          <div className="space-y-4">
            <GoogleSignIn callbackURL={callbackURL} />
            <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />OR EMAIL<span className="h-px flex-1 bg-border" /></div>
            <form onSubmit={submitEmail} className="space-y-3">
              {isSignUp && <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your name" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />}
              <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="Email address" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
              <input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSignUp ? "new-password" : "current-password"} placeholder="Password (8+ characters)" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
              {message && <p role="alert" className="text-sm text-red-500">{message}</p>}
              <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#ff9a00] px-4 py-2.5 text-sm font-bold text-[#1a1000] disabled:opacity-50">{busy ? "Please wait…" : isSignUp ? "Create account" : "Sign in with email"}</button>
            </form>
            <button type="button" onClick={() => { setIsSignUp((value) => !value); setMessage(""); }} className="w-full text-sm font-medium text-primary hover:underline">{isSignUp ? "Already registered? Sign in" : "New here? Create an account"}</button>
          </div>
        ) : <p className="text-center text-sm text-muted-foreground">Sign-in is disabled.</p>}
        <KeyLink to="/" size="default">Continue as guest</KeyLink>
        <LegalLinks className="pt-2" />
      </div>
    </main>
  );
}
