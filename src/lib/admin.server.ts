import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";

export const OWNER_EMAIL = "gjphillips555@gmail.com";

export async function getAdminAccess() {
  const user = await getSessionUser();
  if (!user?.email) return null;
  const email = user.email.trim().toLowerCase();
  const sql = await getSql();
  const rows = await sql.query<{ role: "owner" | "admin" | null; verified: boolean }>(
    `select a.role, u."emailVerified" as verified
       from "user" u left join siftah_admins a on lower(a.email) = lower(u.email)
      where u.id = $1 and lower(u.email) = $2 limit 1`,
    [user.id, email],
  );
  // Only verified mailbox identities can enter the allowlist-protected toolbox.
  if (!rows[0]?.verified) return null;
  if (email === OWNER_EMAIL) return { userId: user.id, email, role: "owner" as const };
  if (!rows[0].role) return null;
  return { userId: user.id, email, role: rows[0].role };
}

export async function requireAdmin() {
  const access = await getAdminAccess();
  if (!access) throw new Error("ADMIN_REQUIRED");
  return access;
}
