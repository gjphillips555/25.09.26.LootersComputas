import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";

export const OWNER_EMAIL = "gjphillips555@gmail.com";

export async function getAdminAccess() {
  const user = await getSessionUser();
  if (!user?.email) return null;
  const email = user.email.trim().toLowerCase();
  const sql = await getSql();
  const rows = await sql.query<{ role: "owner" | "admin" }>(
    "select role from siftah_admins where lower(email) = $1 limit 1",
    [email],
  );
  // The owner bootstrap remains valid even if the allowlist row is accidentally removed.
  if (email === OWNER_EMAIL) return { userId: user.id, email, role: "owner" as const };
  if (!rows[0]) return null;
  return { userId: user.id, email, role: rows[0].role };
}

export async function requireAdmin() {
  const access = await getAdminAccess();
  if (!access) throw new Error("ADMIN_REQUIRED");
  return access;
}
