import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { denSubmitPuzzle } from "@/lib/den";
import { authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/hidden/letter/$token")({
  component: DenLetter,
  head: () => ({
    meta: [{ title: "LootersRetail" }],
  }),
});

function DenLetter() {
  const { token } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [won, setWon] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await denSubmitPuzzle({ data: { token, answer } });
      setWon(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (authEnabled && (isPending || !user)) {
    return (
      <main className="den-shell">
        <div className="den-card">
          <h1>Sign in to continue</h1>
          <p>Use your Looters Computas account before opening this member page.</p>
          <a href={`/login?callbackURL=${encodeURIComponent(`/hidden/letter/${token}`)}`}>Sign in / Create account</a>
        </div>
      </main>
    );
  }

  return (
    <main className="den-mail">
      <article className="den-letter">
        <header>
          <p>From: LootersRetail@protonmail.com</p>
          <p>Subject: one question</p>
        </header>
        <p>whats Hitlers Dogs Name?</p>
        {won ? (
          <div className="den-won">
            <p>well done bitch.</p>
            <Link to="/hidden/forum">Login to the den as an entrant</Link>
            <p className="den-hint">
              Entrant, not viewer. Nothing shows until Looters approves you in
              the forum.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              aria-label="Answer"
              autoComplete="off"
              autoCorrect="off"
            />
            {error ? <p className="den-error">{error}</p> : null}
            <button type="submit" disabled={busy}>
              Send
            </button>
          </form>
        )}
      </article>
    </main>
  );
}
