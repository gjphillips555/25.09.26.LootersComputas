import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";

export const OWNER_EMAIL = "gjphillips555@gmail.com";

export async function getAdminAccess() {
  const user = await getSessionUser();
  if (!user?.email || user.email.trim().toLowerCase() !== OWNER_EMAIL) return null;
  const sql = await getSql();
  const rows = await sql.query<{ verified: boolean }>(
    `select "emailVerified" as verified from "user"
      where id = $1 and lower(email) = $2 limit 1`,
    [user.id, OWNER_EMAIL],
  );
  if (rows[0]?.verified !== true) return null;
  return { userId: user.id, email: OWNER_EMAIL, role: "owner" as const };
}

export async function requireAdmin() {
  const access = await getAdminAccess();
  if (!access) throw new Error("ADMIN_REQUIRED");
  return access;
}
