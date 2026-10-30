import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { requirePayPalConnected } from "./profile";

const listingInput = z.object({
  title: z.string().trim().min(4).max(100),
  description: z.string().trim().min(15).max(5000),
  category: z.enum(["Desktops","Laptops","Components","Monitors","Cables & Plugs","Batteries","Ink","Other"]),
  condition: z.enum(["New","Excellent","Good","Fair","For parts"]),
  priceNzd: z.number().finite().min(0).max(1000000).nullable(),
  acceptsSwaps: z.boolean(),
  location: z.string().trim().max(100).optional().default(""),
});

export const createListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => listingInput.parse(data))
  .handler(async ({ context, data }) => {
    await requirePayPalConnected(context.userId);
    const sql = await getSql();
    const id = randomUUID();
    await sql`insert into listings
      (id,user_id,title,description,category,condition,price_nzd,accepts_swaps,location,status)
      values (${id},${context.userId},${data.title},${data.description},${data.category},
      ${data.condition},${data.priceNzd},${data.acceptsSwaps},${data.location || null},'active')`;
    return { id };
  });

export const getPublicListings = createServerFn({ method: "GET" })
  .validator((data: { category?: string; search?: string } = {}) => ({
    category: typeof data.category === "string" ? data.category.slice(0, 60) : "",
    search: typeof data.search === "string" ? data.search.trim().slice(0, 80) : "",
  }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql`
      select l.id,l.title,l.description,l.category,l.condition,l.price_nzd,
        l.accepts_swaps,l.location,l.created_at,p.display_name
      from listings l left join profiles p on p.user_id=l.user_id
      where l.status='active'
        and (${data.category}='' or l.category=${data.category})
        and (${data.search}='' or l.title ilike ${"%" + data.search + "%"} or l.description ilike ${"%" + data.search + "%"})
      order by l.created_at desc limit 100
    `;
    return rows;
  });

export const getListingForOwner = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((data: { id: string }) => ({ id: z.string().uuid().parse(data.id) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql`select id,title,description,category,condition,price_nzd,accepts_swaps,location,status
      from listings where id=${data.id} and user_id=${context.userId} limit 1`;
    return rows[0] ?? null;
  });

export const withdrawListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: string }) => ({ id: z.string().uuid().parse(data.id) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql`update listings set status='withdrawn',updated_at=now()
      where id=${data.id} and user_id=${context.userId} and status='active' returning id`;
    if (!rows.length) throw new Error("LISTING_NOT_FOUND_OR_NOT_YOURS");
    return { ok: true };
  });
