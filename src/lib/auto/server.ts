import { randomBytes } from "node:crypto";
import type { Sql } from "@/lib/db";
import { safeAvatar } from "@/lib/profile/shared";
import {
  BODY_TYPES, FUELS, MAX_PHOTOS, NZ_REGIONS, TRANSMISSIONS, normalizeNzMobile,
  type AutoFilters, type AutoListing, type SortKey,
} from "./shared";

export const PAGE_SIZE = 24;

export function newId(prefix = "") {
  return prefix + randomBytes(9).toString("base64url");
}

const clean = (v: unknown, max: number) =>
  typeof v === "string"
    ? v
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g, "")
        .trim()
        .slice(0, max)
    : "";
const int = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v.replace(/[,\s$]/g, "")) : NaN;
  return Number.isFinite(n) ? Math.round(n) : null;
};
const oneOf = <T extends readonly string[]>(list: T, v: unknown): T[number] | null =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T[number]) : null;

export function parseFilters(sp: URLSearchParams): AutoFilters {
  const n = (k: string) => {
    const v = int(sp.get(k));
    return v != null && v >= 0 ? v : undefined;
  };
  const s = (k: string, max = 60) => clean(sp.get(k), max) || undefined;
  const sort = sp.get("sort") as SortKey | null;
  return {
    q: s("q", 80), make: s("make"), model: s("model"),
    yearMin: n("yearMin"), yearMax: n("yearMax"), priceMin: n("priceMin"), priceMax: n("priceMax"), odoMax: n("odoMax"),
    region: s("region"), body: s("body"), fuel: s("fuel"), trans: s("trans"),
    sort: sort && ["newest", "price_asc", "price_desc", "year_desc", "odo_asc"].includes(sort) ? sort : "newest",
    page: Math.max(1, Math.min(200, n("page") ?? 1)),
  };
}

type Row = {
  id: string; seller_id: string; title: string; make: string; model: string; year: number; price: number;
  odometer: number | null; region: string; location: string | null; body_type: string | null; fuel: string | null;
  transmission: string | null; rego: string | null; description: string; photos: unknown; status: AutoListing["status"];
  created_at: string | Date; updated_at: string | Date; contact_phone?: string | null; contact_chat?: boolean | null; seller_name: string | null; seller_email: string | null; seller_image: string | null;
};

function sellerName(name: string | null, email: string | null) {
  const n = (name || "").trim();
  return n ? n.slice(0, 40) : (email || "").split("@")[0].slice(0, 20) || "Member";
}

export function toListing(r: Row, opts: { showRego?: boolean } = {}): AutoListing {
  const photos = Array.isArray(r.photos) ? (r.photos as unknown[]).filter((p): p is string => typeof p === "string") : [];
  return {
    id: r.id, source: "siftah", title: r.title, make: r.make, model: r.model, year: Number(r.year), price: Number(r.price),
    odometer: r.odometer == null ? null : Number(r.odometer), region: r.region, location: r.location, bodyType: r.body_type,
    fuel: r.fuel, transmission: r.transmission, rego: opts.showRego === false ? null : r.rego, description: r.description,
    photos, status: r.status, createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString(),
    contactChat: r.contact_chat !== false,
    hasPhone: Boolean(r.contact_phone),
    seller: {
      id: r.seller_id,
      name: sellerName(r.seller_name, r.seller_email),
      image: safeAvatar(r.seller_image),
    },
  };
}

const COLS = `l.*, u.name as seller_name, u.email as seller_email, u.image as seller_image`;

export async function searchListings(sql: Sql, f: AutoFilters) {
  const where: string[] = [`l.status = 'active'`];
  const params: unknown[] = [];
  const add = (clause: string, value: unknown) => {
    params.push(value);
    where.push(clause.replace("?", `$${params.length}`));
  };
  if (f.q) {
    for (const word of f.q.split(/\s+/).filter(Boolean).slice(0, 6)) {
      add(`(l.title || ' ' || l.make || ' ' || l.model || ' ' || coalesce(l.body_type,'') || ' ' || l.description) ilike ?`, `%${word.replace(/[%_\\]/g, "\\$&")}%`);
    }
  }
  if (f.make) add(`lower(l.make) = lower(?)`, f.make);
  if (f.model) add(`lower(l.model) like lower(?)`, `${f.model.replace(/[%_\\]/g, "\\$&")}%`);
  if (f.yearMin) add(`l.year >= ?`, f.yearMin);
  if (f.yearMax) add(`l.year <= ?`, f.yearMax);
  if (f.priceMin) add(`l.price >= ?`, f.priceMin);
  if (f.priceMax) add(`l.price <= ?`, f.priceMax);
  if (f.odoMax) add(`l.odometer <= ?`, f.odoMax);
  if (f.region) add(`l.region = ?`, f.region);
  if (f.body) add(`l.body_type = ?`, f.body);
  if (f.fuel) add(`l.fuel = ?`, f.fuel);
  if (f.trans) add(`l.transmission = ?`, f.trans);
  const order = {
    newest: "l.created_at desc",
    price_asc: "l.price asc, l.created_at desc",
    price_desc: "l.price desc, l.created_at desc",
    year_desc: "l.year desc, l.created_at desc",
    odo_asc: "l.odometer asc nulls last, l.created_at desc",
  }[f.sort ?? "newest"];
  const whereSql = where.join(" and ");
  const page = f.page ?? 1;
  const [{ count }] = await sql.query<{ count: number }>(`select count(*) as count from auto_listings l where ${whereSql}`, params);
  const rows = await sql.query<Row>(
    `select ${COLS} from auto_listings l join "user" u on u.id = l.seller_id
      where ${whereSql} order by ${order} limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}`,
    params,
  );
  // Rego plates are shown on the detail page, not in search results.
  return { items: rows.map((r) => toListing(r, { showRego: false })), total: Number(count) || 0, page, pageSize: PAGE_SIZE };
}

export async function getListing(sql: Sql, id: string) {
  const rows = await sql.query<Row>(`select ${COLS} from auto_listings l join "user" u on u.id = l.seller_id where l.id = $1`, [id]);
  return rows[0] ? toListing(rows[0]) : null;
}

export async function myListings(sql: Sql, userId: string) {
  const rows = await sql.query<Row>(
    `select ${COLS} from auto_listings l join "user" u on u.id = l.seller_id
      where l.seller_id = $1 and l.status <> 'removed' order by l.created_at desc limit 100`,
    [userId],
  );
  return rows.map((r) => toListing(r));
}

export type ListingInput = {
  title: string; make: string; model: string; year: number; price: number; odometer: number | null; region: string;
  location: string | null; bodyType: string | null; fuel: string | null; transmission: string | null; rego: string | null;
  description: string; photos: string[]; contactPhone: string | null; contactChat: boolean;
};

/** Validate and normalise listing input. Returns field errors (if any). */
export function validateListing(body: Record<string, unknown>): { value?: ListingInput; errors?: Record<string, string> } {
  const errors: Record<string, string> = {};
  const make = clean(body.make, 40);
  const model = clean(body.model, 60);
  const year = int(body.year);
  const price = int(body.price);
  const odometer = body.odometer === "" || body.odometer == null ? null : int(body.odometer);
  const region = oneOf(NZ_REGIONS, body.region);
  const thisYear = new Date().getFullYear();
  if (make.length < 2) errors.make = "Enter the make.";
  if (!model) errors.model = "Enter the model.";
  if (year == null || year < 1900 || year > thisYear + 1) errors.year = `Year must be 1900–${thisYear + 1}.`;
  if (price == null || price < 0 || price > 10_000_000) errors.price = "Enter a price in NZD.";
  if (odometer != null && (odometer < 0 || odometer > 3_000_000)) errors.odometer = "Odometer looks wrong.";
  if (!region) errors.region = "Choose a region.";
  let rego = clean(body.rego, 10).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (rego && (rego.length < 1 || rego.length > 7)) errors.rego = "NZ plates are up to 7 letters/numbers.";
  if (!rego) rego = "";
  const description = clean(body.description, 5000);
  let title = clean(body.title, 90);
  if (!title && make && model && year) title = `${year} ${make} ${model}`;
  if (title.length < 3) errors.title = "Add a title.";
  const phoneRaw = clean(body.contactPhone, 24);
  const contactPhone = phoneRaw ? normalizeNzMobile(phoneRaw) : null;
  if (phoneRaw && !contactPhone) errors.contactPhone = "Enter an NZ mobile, e.g. 021 123 4567 or +64 21 123 4567.";
  const contactChat = body.contactChat === undefined ? true : body.contactChat === true || body.contactChat === "true";
  const photos = Array.isArray(body.photos)
    ? body.photos.filter((p): p is string => typeof p === "string" && p.length < 600).slice(0, MAX_PHOTOS)
    : [];
  if (Object.keys(errors).length) return { errors };
  return {
    value: {
      title, make, model, year: year!, price: price!, odometer, region: region!,
      location: clean(body.location, 60) || null,
      bodyType: oneOf(BODY_TYPES, body.bodyType),
      fuel: oneOf(FUELS, body.fuel),
      transmission: oneOf(TRANSMISSIONS, body.transmission),
      rego: rego || null,
      description,
      photos,
      contactPhone,
      contactChat,
    },
  };
}

/** Every photo must be one this user uploaded (Blob URL or our DB-photo URL). */
export async function ownedPhotos(sql: Sql, userId: string, photos: string[]) {
  if (!photos.length) return true;
  const ids = photos.map((p) => {
    const m = /^\/api\/auto\/photo\/([A-Za-z0-9_-]+)$/.exec(p);
    return m ? { id: m[1] } : { url: p };
  });
  const rows = await sql.query<{ id: string; url: string | null }>(
    `select id, url from auto_photos where owner_id = $1 and (id = any($2::text[]) or url = any($3::text[]))`,
    [userId, ids.filter((x) => "id" in x).map((x) => (x as { id: string }).id), ids.filter((x) => "url" in x).map((x) => (x as { url: string }).url)],
  );
  const okIds = new Set(rows.map((r) => r.id));
  const okUrls = new Set(rows.map((r) => r.url).filter((u): u is string => Boolean(u)));
  return ids.every((x) => ("id" in x ? okIds.has((x as { id: string }).id) : okUrls.has((x as { url: string }).url)));
}
