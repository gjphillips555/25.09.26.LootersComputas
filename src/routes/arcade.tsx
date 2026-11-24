import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/arcade")({
  head: () => ({
    meta: [
      { title: "Siftah Arcade | Siftah Solutions" },
      { name: "description", content: "Thousands of free browser games from Looters Computas." },
    ],
  }),
  component: ArcadePage,
});

function ArcadePage() {
  return (
    <AppShell>
      <iframe
        src="/arcade.html"
        title="Siftah Arcade"
        style={{ display: "block", height: "calc(100dvh - 4.25rem)", border: 0 }}
        className="-mx-4 w-[calc(100%+2rem)] sm:-mx-6 sm:w-[calc(100%+3rem)]"
      />
    </AppShell>
  );
}
