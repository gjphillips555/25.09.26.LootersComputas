import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/siftah")({
  head: () => ({
    meta: [
      { title: "Siftah Mobile | Looters Computas" },
      { name: "description", content: "Siftah, Dexter, Da Vinci and Super Saiyan Premium in one workspace." },
    ],
  }),
  component: SiftahRedirect,
});

function SiftahRedirect() {
  useEffect(() => {
    window.location.replace("/siftah/" + window.location.search + window.location.hash);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090b] px-6 text-center text-zinc-300">
      <p>Opening your Siftah Mobile workspace… <a className="underline" href="/siftah/">Continue</a></p>
    </main>
  );
}
