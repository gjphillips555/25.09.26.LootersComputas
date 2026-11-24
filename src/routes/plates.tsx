import { createFileRoute } from "@tanstack/react-router";

/**
 * The real sticker maker lives at the static file public/plates/index.html
 * (true-size 360×124 mm print CSS, Licenz outlines, PDF download).
 * A full page load of /plates or /plates/index.html serves that file.
 * This route only exists so client-side <Link to="/plates"> navigation
 * does not mount the old in-app maker (A4 @page, broken cdnfonts Licenz).
 */
export const Route = createFileRoute("/plates")({
  head: () => ({
    meta: [
      { title: "NZ Number Plate Sticker Maker | Looters Computas" },
      {
        name: "description",
        content:
          "Generate and print realistic New Zealand number plate stickers at correct 360×124 mm dimensions.",
      },
    ],
  }),
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      window.location.replace("/plates/index.html");
    }
  },
  component: function PlatesRedirect() {
    return null;
  },
});
