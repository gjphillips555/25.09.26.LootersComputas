import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";
import { newId } from "@/lib/auto/server";

const TYPES = new Set(["image/jpeg", "image/webp", "image/png"]);
const MAX_BYTES = Math.floor(4.4 * 1024 * 1024); // just under Vercel's 4.5 MB request body limit

/**
 * Upload one listing photo (multipart field "file"). The browser re-encodes at original resolution (EXIF stripped), ≤4 MB.
 * Stored in Vercel Blob when BLOB_READ_WRITE_TOKEN is configured; otherwise (or if Blob fails)
 * in Postgres and served from /api/auto/photo/:id. Either way it's recorded in auto_photos so
 * listings can only use photos their owner uploaded.
 */
export const Route = createFileRoute("/api/auto/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await getSessionUser().catch(() => null);
        if (!session) return json({ error: "Sign in to upload photos.", code: "SIGN_IN_REQUIRED" }, 401);
        const sql = await getSql();
        const [recent] = await sql.query<{ n: number }>(
          `select count(*) as n from auto_photos where owner_id = $1 and created_at > now() - interval '1 hour'`,
          [session.id],
        );
        if (Number(recent?.n) >= 60) return json({ error: "Photo upload limit reached. Try again in an hour." }, 429);

        let file: File | null = null;
        try {
          const form = await request.formData();
          const f = form.get("file");
          file = f instanceof File ? f : null;
        } catch {
          return json({ error: "Send the photo as multipart form data." }, 400);
        }
        if (!file) return json({ error: "No photo received." }, 400);
        if (!TYPES.has(file.type)) return json({ error: "Photos must be JPEG, WebP or PNG." }, 400);
        if (file.size > MAX_BYTES) return json({ error: "Photo is too large (max 4 MB)." }, 413);
        const bytes = new Uint8Array(await file.arrayBuffer());
        // Magic-number check so the declared type matches the bytes.
        const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
        const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
        const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
        if (!(isJpeg || isPng || isWebp)) return json({ error: "That file isn't a valid image." }, 400);

        const id = newId("p");
        const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
          try {
            const { put } = await import("@vercel/blob");
            const blob = await put(`siftah-auto/${session.id}/${id}.${ext}`, Buffer.from(bytes), {
              access: "public",
              contentType: file.type,
              addRandomSuffix: true,
            });
            await sql.query(`insert into auto_photos (id, owner_id, content_type, url) values ($1,$2,$3,$4)`, [id, session.id, file.type, blob.url]);
            return json({ ok: true, url: blob.url, store: "blob" });
          } catch (err) {
            console.error("[auto] Blob upload failed, falling back to Postgres", err);
          }
        }
        await sql.query(`insert into auto_photos (id, owner_id, content_type, data) values ($1,$2,$3,$4)`, [id, session.id, file.type, Buffer.from(bytes)]);
        return json({ ok: true, url: `/api/auto/photo/${id}`, store: "db" });
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
