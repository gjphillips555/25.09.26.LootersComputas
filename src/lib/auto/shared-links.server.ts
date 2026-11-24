import type { Sql } from "@/lib/db";
import { safeAvatar } from "@/lib/profile/shared";
import { SHARE_SITES, type ShareSite, type SharedLink } from "./shared";

type Row = {
  id: string; sharer_id: string; site: ShareSite; url: string; og_title: string | null; member_title: string | null;
  og_description: string | null; og_image: string | null; og_site_name: string | null; price: number | null;
  fetch_status: SharedLink["fetchStatus"]; status: SharedLink["status"]; created_at: string | Date;
  sharer_name: string | null; sharer_email: string | null; sharer_image: string | null; reports?: number | string | null;
};

export const LINK_COLS = `s.*, u.name as sharer_name, u.email as sharer_email, u.image as sharer_image`;

export function toSharedLink(r: Row, withReports = false): SharedLink {
  const name = (r.sharer_name || "").trim() || (r.sharer_email || "").split("@")[0].slice(0, 20) || "Member";
  return {
    id: r.id,
    site: r.site,
    siteLabel: SHARE_SITES[r.site]?.label ?? r.site,
    url: r.url,
    title: r.og_title || r.member_title || null,
    titleSource: r.og_title ? "og" : r.member_title ? "member" : null,
    description: r.og_description,
    image: r.og_image,
    siteName: r.og_site_name,
    price: r.price == null ? null : Number(r.price),
    fetchStatus: r.fetch_status,
    status: r.status,
    createdAt: new Date(r.created_at).toISOString(),
    sharer: { id: r.sharer_id, name: name.slice(0, 40), image: safeAvatar(r.sharer_image) },
    ...(withReports ? { reports: Number(r.reports) || 0 } : {}),
  };
}

export const LINK_PAGE_SIZE = 24;

export async function listSharedLinks(
  sql: Sql,
  opts: { q?: string; site?: string; page?: number; limit?: number; withReports?: boolean; priceMin?: number; priceMax?: number },
) {
  const where = [`s.status = 'active'`];
  const params: unknown[] = [];
  const add = (clause: string, v: unknown) => {
    params.push(v);
    where.push(clause.replace("?", `$${params.length}`));
  };
  if (opts.q) {
    for (const w of opts.q.split(/\s+/).filter(Boolean).slice(0, 6)) {
      add(`(coalesce(s.og_title,'') || ' ' || coalesce(s.member_title,'') || ' ' || coalesce(s.og_description,'')) ilike ?`, `%${w.replace(/[%_\\]/g, "\\$&")}%`);
    }
  }
  if (opts.site && opts.site in SHARE_SITES) add(`s.site = ?`, opts.site);
  if (opts.priceMin) add(`s.price >= ?`, opts.priceMin);
  if (opts.priceMax) add(`s.price <= ?`, opts.priceMax);
  const limit = Math.min(opts.limit ?? LINK_PAGE_SIZE, LINK_PAGE_SIZE);
  const page = Math.max(1, Math.min(200, opts.page ?? 1));
  const whereSql = where.join(" and ");
  const [{ count }] = await sql.query<{ count: number }>(`select count(*) as count from auto_shared_links s where ${whereSql}`, params);
  const reports = opts.withReports ? `, (select count(*) from auto_link_reports r where r.link_id = s.id) as reports` : "";
  const rows = await sql.query<Row>(
    `select ${LINK_COLS}${reports} from auto_shared_links s join "user" u on u.id = s.sharer_id
      where ${whereSql} order by s.created_at desc limit ${limit} offset ${(page - 1) * limit}`,
    params,
  );
  return { items: rows.map((r) => toSharedLink(r, opts.withReports)), total: Number(count) || 0, page, pageSize: limit };
}

export async function getSharedLink(sql: Sql, id: string) {
  const rows = await sql.query<Row>(`select ${LINK_COLS} from auto_shared_links s join "user" u on u.id = s.sharer_id where s.id = $1`, [id]);
  return rows[0] ? toSharedLink(rows[0]) : null;
}

export async function mySharedLinks(sql: Sql, userId: string) {
  const rows = await sql.query<Row>(
    `select ${LINK_COLS} from auto_shared_links s join "user" u on u.id = s.sharer_id
      where s.sharer_id = $1 and s.status = 'active' order by s.created_at desc limit 100`,
    [userId],
  );
  return rows.map((r) => toSharedLink(r));
}
