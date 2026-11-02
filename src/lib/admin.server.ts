import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";

export const OWNER_EMAIL = "gjphillips555@gmail.com";

export type AdminAccess = {
  userId: string;
  email: string;
  role: "owner" | "admin";
};

/**
 * Admin access for Looters Computas + Siftah control room.
 * Only the verified owner email and emails explicitly listed in siftah_admins
 * (approved by the owner) may enter.
 */
export async function getAdminAccess(): Promise<AdminAccess | null> {
  const user = await getSessionUser();
  if (!user?.email) return null;

  const email = user.email.trim().toLowerCase();
  const sql = await getSql();

  // Must be a verified account
  const rows = await sql.query<{ verified: boolean }>(
    `select "emailVerified" as verified from "user"
      where id = $1 and lower(email) = $2 limit 1`,
    [user.id, email],
  );
  if (rows[0]?.verified !== true) return null;

  // Owner shortcut (always allowed when verified)
  if (email === OWNER_EMAIL) {
    // Keep row in sync
    await sql.query(
      `insert into siftah_admins (email, role) values ($1, 'owner')
       on conflict (email) do update set role = 'owner'`,
      [OWNER_EMAIL],
    );
    return { userId: user.id, email: OWNER_EMAIL, role: "owner" };
  }

  // Other approved admins from the allowlist table
  const admins = await sql.query<{ role: string }>(
    `select role from siftah_admins where lower(email) = $1 limit 1`,
    [email],
  );
  const role = admins[0]?.role;
  if (role === "owner" || role === "admin") {
    return { userId: user.id, email, role: role as "owner" | "admin" };
  }

  return null;
}

export async function requireAdmin() {
  const access = await getAdminAccess();
  if (!access) throw new Error("ADMIN_REQUIRED");
  return access;
}
