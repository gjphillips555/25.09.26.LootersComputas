import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/siftah-message")({
  component: SiftahMessagePage,
  head: () => ({ meta: [{ title: "Siftah Message · Looters Computas" }] }),
});

function SiftahMessagePage() {
  const { user, isPending } = useCurrentUserState();

  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-sm text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Siftah Message</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Temporary chats between members. Messages auto-delete from our servers after 6 hours by default.
        </p>
        <Link
          to="/login"
          search={{ callbackURL: "/siftah-message" }}
          className="mt-6 inline-flex rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white"
        >
          Sign in to open messenger
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-bold">Siftah Message</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Messenger is being restored. Please check back shortly — your chats are safe.
      </p>
      <a href="/siftah/" className="mt-6 inline-flex rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white">
        Open Siftah Mobile
      </a>
    </main>
  );
}
