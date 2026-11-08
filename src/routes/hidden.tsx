import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/hidden")({
  component: HiddenGate,
  head: () => ({
    meta: [{ title: "Member area" }],
  }),
});

function HiddenGate() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();

  useEffect(() => {
    if (!isPending && user) {
      void navigate({ to: "/hidden/forum" });
    }
  }, [isPending, user, navigate]);

  if (authEnabled && (isPending || !user)) {
    return (
      <main className="den-shell">
        <div className="den-card">
          <Link to="/" className="mx-auto block w-fit opacity-80">
            <BrandLogo className="h-12 w-auto max-w-[220px] object-contain" />
          </Link>
          <h1>Sign in to continue</h1>
          <p>Use the same Looters Computas / Siftah account.</p>
          <a href="/login?callbackURL=%2Fhidden%2Fforum" className="mt-4 inline-flex rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white">
            Sign in / Create account
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="den-shell">
      <div className="den-card">
        <p>Opening member area…</p>
      </div>
    </main>
  );
}
