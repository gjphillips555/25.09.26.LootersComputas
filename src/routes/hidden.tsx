import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { GoogleMark } from "@/components/google-mark";
import { KeyButton } from "@/components/key-button";
import { authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { denLogin, denSignup } from "@/lib/den";

export const Route = createFileRoute("/hidden")({
  component: HiddenGate,
  head: () => ({
    meta: [{ title: "—" }],
  }),
});

function HiddenGate() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "up") {
        const res = await denSignup({ data: { username, email, password } });
        void navigate({
          to: "/hidden/letter/$token",
          params: { token: res.token },
        });
        return;
      }
      const res = await denLogin({ data: { username, password } });
      if (res.role === "admin" || res.status === "approved" || res.status === "entrant") {
        void navigate({ to: "/hidden/forum" });
      } else {
        setError("Nothing to see yet.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No.");
    } finally {
      setBusy(false);
    }
  }

  if (authEnabled && (isPending || !user)) {
    return (
      <main className="den-shell">
        <div className="den-card">
          <h1>Sign in to continue</h1>
          <p>Use your Looters Computas account before entering this member area.</p>
          <a href="/login?callbackURL=%2Fhidden">Sign in / Create account</a>
        </div>
      </main>
    );
  }

  return (
    <main className="den-shell">
      <div className="den-card">
        <Link to="/" className="mx-auto block w-fit opacity-80">
          <BrandLogo className="h-12 w-auto max-w-[220px] object-contain" />
        </Link>
        <p className="den-kicker">encrypted channel · authorised personnel</p>
        <h1>{mode === "up" ? "Request access" : "Decrypt"}</h1>
        <form className="den-form" onSubmit={onSubmit}>
          <label>
            Username
            <input
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>
          {mode === "up" ? (
            <label>
              Email
              <input
                type="email"
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
          ) : null}
          <label>
            Password
            <input
              type="password"
              value={password}
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "up" ? 8 : 1}
            />
          </label>
          {mode === "up" ? (
            <p className="den-hint">
              A username and password is fine. Google is optional — you still
              will not get in until the letter is solved, and Looters still has
              to approve you in the den.
            </p>
          ) : null}
          {error ? <p className="den-error">{error}</p> : null}
          <KeyButton disabled={busy} className="w-full">
            {busy ? "…" : mode === "up" ? "Send the letter" : "Enter"}
          </KeyButton>
        </form>
        {mode === "up" && authEnabled ? (
          <button
            type="button"
            className="den-google"
            onClick={() =>
              signIn("grok-google", { callbackURL: "/hidden" })
            }
          >
            <GoogleMark className="size-4" />
            Google signup (still need the letter)
          </button>
        ) : null}
        <button
          type="button"
          className="den-switch"
          onClick={() => {
            setError("");
            setMode(mode === "up" ? "in" : "up");
          }}
        >
          {mode === "up" ? "Already have a handle? Decrypt." : "Need in? Request access."}
        </button>
      </div>
    </main>
  );
}
