import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { authEnabled, authClient } from "@/lib/auth/client";
import { BrandedGoogleSignIn } from "@/components/branded-google-sign-in";
import { KeyLink } from "@/components/key-button";
import { LegalLinks } from "@/components/legal-links";
import { setAgreedTerms } from "@/lib/terms-agree";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [callbackURL, setCallbackURL] = useState("/");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("callbackURL");
    if (requested && requested.startsWith("/") && !requested.startsWith("//") && !requested.includes("\\") && requested.length < 300) {
      setCallbackURL(requested);
    }
  }, []);

  async function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSignUp && !termsAccepted) {
      setMessage("Please agree to the Terms and Conditions before creating your account.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = isSignUp
        ? await authClient.signUp.email({
            name: name.trim() || email.split("@")[0],
            email: email.trim(),
            password,
            callbackURL,
          })
        : await authClient.signIn.email({ email: email.trim(), password, callbackURL });
      if (result.error) throw new Error(result.error.message || "Email sign-in failed.");
      if (isSignUp) setAgreedTerms();
      window.location.href = callbackURL;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4 sm:p-6">
      <div className="w-full max-w-md space-y-5">
        <BrandedGoogleSignIn callbackURL={callbackURL} />

        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
          <h1 className="text-center font-display text-lg font-semibold">
            {isSignUp ? "Create account with email" : "Or sign in with email"}
          </h1>
          <p className="text-center text-sm text-muted-foreground">
            Any email works, including Proton Mail.
          </p>
          {authEnabled ? (
            <div className="space-y-4">
              <form onSubmit={submitEmail} className="space-y-3">
                {isSignUp && (
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    placeholder="Your name"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
                  />
                )}
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="Email address"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
                />
                {isSignUp && (
                  <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(event) => setTermsAccepted(event.target.checked)}
                      className="mt-1 size-4 shrink-0 accent-orange-500"
                    />
                    <span>
                      By creating this account, I agree to the{" "}
                      <Link to="/termsandconditions" className="underline">Terms and Conditions</Link>
                      {" "}and{" "}
                      <Link to="/storepolicy" className="underline">Store Policy</Link>,
                      including the Siftah AI use and third-party processing terms.
                    </span>
                  </label>
                )}
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  placeholder="Password (8+ characters)"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
                />
                {message && (
                  <p role="alert" className="text-sm text-red-500">
                    {message}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={busy || (isSignUp && !termsAccepted)}
                  className="w-full rounded-xl bg-[#ff9a00] px-4 py-2.5 text-sm font-bold text-[#1a1000] disabled:opacity-50"
                >
                  {busy ? "Please wait…" : isSignUp ? "Create account" : "Sign in with email"}
                </button>
              </form>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp((value) => !value);
                  setTermsAccepted(false);
                  setMessage("");
                }}
                className="w-full text-sm font-medium text-primary hover:underline"
              >
                {isSignUp ? "Already registered? Sign in" : "New here? Create an account"}
              </button>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">Sign-in is disabled.</p>
          )}
          <KeyLink to="/" size="default">
            Continue as guest
          </KeyLink>
          <LegalLinks className="pt-1" />
        </div>
      </div>
    </main>
  );
}
