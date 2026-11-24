import { createServerFn } from "@tanstack/react-start";
import type { AutoListing, SharedLink } from "./shared";

export type AutoDetailData =
  | { kind: "listing"; listing: AutoListing }
  | { kind: "shared"; link: SharedLink }
  | { kind: "removed"; id: string }
  | null;

/** Public data for /auto/listing/$id (member listings, or "sl_…" shared links). Rendered on the server for SEO/OG. */
export const getAutoDetail = createServerFn({ method: "GET" })
  .validator((input: unknown) => {
    const id = String((input as { id?: unknown } | null)?.id ?? "");
    if (!/^[A-Za-z0-9_-]{6,40}$/.test(id)) throw new Error("Invalid id");
    return { id };
  })
  .handler(async ({ data }): Promise<AutoDetailData> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    if (data.id.startsWith("sl_")) {
      const { getSharedLink } = await import("./shared-links.server");
      const link = await getSharedLink(sql, data.id);
      if (!link) return null;
      return link.status === "removed" ? { kind: "removed", id: data.id } : { kind: "shared", link };
    }
    const { getListing } = await import("./server");
    const listing = await getListing(sql, data.id);
    if (!listing) return null;
    return listing.status === "removed" ? { kind: "removed", id: data.id } : { kind: "listing", listing };
  });
