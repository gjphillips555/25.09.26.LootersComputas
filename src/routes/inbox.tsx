import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/inbox")({
  component: InboxPage,
});

function InboxPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-2xl py-10">
        <h1 className="text-3xl font-black">Inbox</h1>
        <p className="mt-2 text-muted-foreground">
          Buyer / seller messaging is coming soon. Offers and deal threads will land here.
        </p>
        <Link to="/account" className="mt-6 inline-flex text-sm font-semibold text-orange-600 hover:underline">
          ← Back to account
        </Link>
      </main>
    </AppShell>
  );
}
