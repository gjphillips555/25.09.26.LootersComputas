import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/arcade")({
  head: () => ({
    meta: [
      { title: "Arcade | Looters Computas" },
      {
        name: "description",
        content: "Thousands of free browser games from Looters Computas. No sign-up, just play.",
      },
    ],
  }),
  component: ArcadePage,
});

function ArcadePage() {
  return (
    <AppShell>
      <div className="w-full" style={{ height: "calc(100vh - 4rem)" }}>
        <iframe
          src="/arcade.html"
          title="Looters Computas Arcade"
          className="h-full w-full border-0"
          allow="fullscreen; autoplay; gamepad"
        />
      </div>
    </AppShell>
  );
}
