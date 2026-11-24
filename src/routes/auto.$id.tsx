import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy URL: /auto/$id now lives at /auto/listing/$id. */
export const Route = createFileRoute("/auto/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/auto/listing/$id" as "/", params: { id: params.id } as never, statusCode: 301 });
  },
});
