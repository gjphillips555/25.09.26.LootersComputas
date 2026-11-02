import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/arcade")({
  head: () => ({
    meta: [
      { title: "Arcade | Looters Computas" },
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
        title="Looters Computas Arcade"
        style={{ display: "block", width: "100%", height: "100vh", border: 0 }}
      />
    </AppShell>
  );
}
