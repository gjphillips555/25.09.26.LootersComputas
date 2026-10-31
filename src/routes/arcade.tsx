import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/arcade")({
  head: () => ({
    meta: [
      { title: "Arcade | Looters Computas" },
      { name: "description", content: "Play free browser games at Looters Computas Arcade" },
    ],
  }),
  component: ArcadePage,
});

function ArcadePage() {
  return (
    <div className="w-full h-[calc(100vh-4rem)]">
      <iframe
        src="/arcade.html"
        title="Looters Arcade"
        className="w-full h-full border-0"
        allow="fullscreen; autoplay; gamepad"
      />
    </div>
  );
}
