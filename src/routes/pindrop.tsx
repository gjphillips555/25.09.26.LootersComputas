import { createFileRoute } from "@tanstack/react-router";

/**
 * PinDrop lives at the static offline PWA public/pindrop/index.html
 * (own manifest + service worker scoped to /pindrop/). A full page load of
 * /pindrop/ serves that file; this route only catches client-side navigation
 * or a bare /pindrop and hands off to the static app.
 */
export const Route = createFileRoute("/pindrop")({
  head: () => ({
    meta: [
      { title: "PinDrop | Siftah Solutions" },
      { name: "description", content: "Drop labelled emoji pins on an offline map of New Zealand." },
    ],
  }),
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      window.location.replace("/pindrop/" + window.location.search + window.location.hash);
    }
  },
  component: function PinDropRedirect() {
    return null;
  },
});
