import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";
import { newId } from "@/lib/auto/server";
import { normalizeUsername, safeAvatar, usernameError } from "@/lib/profile/shared";

const TYPES = new Set(["image/jpeg", "image/webp", "image/png"]);
const MAX_BYTES = 1024 * 1024; // the browser sends a 512x512 square, normally ~60 KB
const AVATARS_PER_DAY = 20;

/**
 * Member profile: display username + avatar. Writes go to "user".name / "user".image, so the new
 * name and picture show everywhere (chat, online list, listings, chat head).
 * GET                                   → { profile }
 * POST multipart {file}                 → upload a new square avatar
 * POST json {action: set_name, name} | {action: revert_avatar}
 */
export const Route = createFileRoute("/api/profile/")({
  server: {
    handlers: {
      GET: async () => {
        const session = await getSessionUser().catch(() => null);
        if (!session) return json({ error: "Sign in to edit your profile.", code: "SIGN_IN_REQUIRED" }, 401);
        const sql = await getSql();
        return json({ profile: await loadProfile(sql, session.id) });
      },
      POST: async ({ request }) => {
        const session = await getSessionUser().catch(() => null);
        if (!session) return json({ error: "Sign in to edit your profile.", code: "SIGN_IN_REQUIRED" }, 401);
        const me = session.id;
        const sql = await getSql();
        // Remember the original (e.g. Google) avatar before the first change so members can revert.
        await sql.query(
          `insert into user_profiles (user_id, original_image) select id, image from "user" where id = $1 on conflict (user_id) do nothing`,
          [me],
        );

        const ctype = request.headers.get("content-type") || "";
        if (ctype.startsWith("multipart/form-data")) {
          const [recent] = await sql.query<{ n: number }>(
            `select count(*)::int as n from profile_avatars where user_id = $1 and created_at > now() - interval '24 hours'`,
            [me],
          );
          if (Number(recent?.n) >= AVATARS_PER_DAY) return json({ error: "Avatar change limit reached for today." }, 429);
          let file: File | null = null;
          try {
            const f = (await request.formData()).get("file");
            file = f instanceof File ? f : null;
          } catch {
            return json({ error: "Send the picture as multipart form data." }, 400);
          }
          if (!file) return json({ error: "No picture received." }, 400);
          if (!TYPES.has(file.type)) return json({ error: "Pictures must be JPEG, WebP or PNG." }, 400);
          if (file.size > MAX_BYTES) return json({ error: "Picture is too large." }, 413);
          const bytes = new Uint8Array(await file.arrayBuffer());
          const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
          const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
          const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
          if (!(isJpeg || isPng || isWebp)) return json({ error: "That file isn't a valid image." }, 400);
          const id = newId("av");
          const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
          let url = `/api/profile/avatar/${id}`;
          let stored = false;
          if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
            try {
              const { put } = await import("@vercel/blob");
              const blob = await put(`siftah-avatars/${me}/${id}.${ext}`, Buffer.from(bytes), { access: "public", contentType: file.type, addRandomSuffix: true });
              await sql.query(`insert into profile_avatars (id, user_id, content_type, url) values ($1,$2,$3,$4)`, [id, me, file.type, blob.url]);
              url = blob.url;
              stored = true;
            } catch (err) {
              console.error("[profile] Blob upload failed, falling back to Postgres", err);
            }
          }
          if (!stored) await sql.query(`insert into profile_avatars (id, user_id, content_type, data) values ($1,$2,$3,$4)`, [id, me, file.type, Buffer.from(bytes)]);
          await sql.query(`update "user" set image = $2, "updatedAt" = now() where id = $1`, [me, url]);
          await sql.query(`update user_profiles set custom_avatar = $2, updated_at = now() where user_id = $1`, [me, url]);
          return json({ ok: true, profile: await loadProfile(sql, me) });
        }

        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "Bad request" }, 400);
        }
        const action = String(body.action || "");

        if (action === "set_name") {
          const name = normalizeUsername(String(body.name || ""));
          const err = usernameError(name);
          if (err) return json({ error: err, code: "BAD_NAME" }, 400);
          const [{ n } = { n: 0 }] = await sql.query<{ n: number }>(
            `select count(*)::int as n from user_profiles where user_id = $1 and name_changed_at > now() - interval '10 seconds'`,
            [me],
          );
          if (Number(n) > 0) return json({ error: "Wait a few seconds before changing your name again." }, 429);
          const taken = await sql.query(
            `select 1 from "user" where lower(name) = lower($1) and id <> $2
             union all select 1 from user_profiles where lower(username) = lower($1) and user_id <> $2 limit 1`,
            [name, me],
          );
          if (taken.length) return json({ error: "That username is taken.", code: "TAKEN" }, 409);
          try {
            await sql.query(`update user_profiles set username = $2, name_changed_at = now(), updated_at = now() where user_id = $1`, [me, name]);
          } catch {
            return json({ error: "That username is taken.", code: "TAKEN" }, 409);
          }
          await sql.query(`update "user" set name = $2, "updatedAt" = now() where id = $1`, [me, name]);
          return json({ ok: true, profile: await loadProfile(sql, me) });
        }

        if (action === "revert_avatar") {
          await sql.query(
            `update "user" u set image = p.original_image, "updatedAt" = now() from user_profiles p where p.user_id = u.id and u.id = $1`,
            [me],
          );
          await sql.query(`update user_profiles set custom_avatar = null, updated_at = now() where user_id = $1`, [me]);
          return json({ ok: true, profile: await loadProfile(sql, me) });
        }

        return json({ error: "Unknown action" }, 400);
      },
    },
  },
});

async function loadProfile(sql: Awaited<ReturnType<typeof getSql>>, id: string) {
  const [r] = await sql.query<{ name: string | null; email: string | null; image: string | null; original_image: string | null; custom_avatar: string | null }>(
    `select u.name, u.email, u.image, p.original_image, p.custom_avatar from "user" u left join user_profiles p on p.user_id = u.id where u.id = $1`,
    [id],
  );
  return {
    name: (r?.name || "").trim() || (r?.email || "").split("@")[0] || "Member",
    image: safeAvatar(r?.image),
    originalImage: safeAvatar(r?.original_image),
    customAvatar: Boolean(r?.custom_avatar),
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
