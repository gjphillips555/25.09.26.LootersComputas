import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/prints")({
  head: () => ({
    meta: [
      { title: "3D Blueprints | Looters Computas" },
      { name: "description", content: "Free 3D print blueprints from Looters Computas." },
    ],
  }),
  component: PrintsPage,
});

function PrintsPage() {
  return (
    <AppShell>
      <iframe
        src="/prints.html"
        title="Looters Computas 3D Blueprints"
        style={{ display: "block", width: "100%", height: "100vh", border: 0 }}
      />
    </AppShell>
  );
}
