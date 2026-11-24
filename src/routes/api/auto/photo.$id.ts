import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";

/** Serves listing photos stored in Postgres (fallback when Vercel Blob isn't used). */
export const Route = createFileRoute("/api/auto/photo/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = String(params.id || "").slice(0, 40);
        if (!/^[A-Za-z0-9_-]+$/.test(id)) return new Response("Not found", { status: 404 });
        const sql = await getSql();
        const rows = await sql.query<{ content_type: string; data: Uint8Array | null; url: string | null }>(
          `select content_type, data, url from auto_photos where id = $1`,
          [id],
        );
        const row = rows[0];
        if (!row) return new Response("Not found", { status: 404 });
        if (row.url) return Response.redirect(row.url, 302);
        if (!row.data) return new Response("Not found", { status: 404 });
        return new Response(row.data as unknown as BodyInit, {
          headers: {
            "Content-Type": row.content_type,
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
