import { createServerFn } from "@tanstack/react-start";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

const topicInput = z.object({
  title: z.string().trim().min(5).max(120),
  category: z.enum(["General", "Help & Support", "Hardware", "Software", "Buying & Selling", "Showcase"]),
  body: z.string().trim().min(10).max(8000),
});
const postInput = z.object({
  topicId: z.string().uuid(),
  body: z.string().trim().min(2).max(8000),
});

export const getForumTopics = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    return sql`
      select t.id,t.title,t.category,t.created_at,t.updated_at,
        u.name as author_name,u.image as author_image,
        count(p.id)::int as reply_count,
        (select fp.body from forum_posts fp where fp.topic_id=t.id order by fp.created_at desc limit 1) as latest_body,
        (select fu.name from forum_posts fp join "user" fu on fu.id=fp.user_id where fp.topic_id=t.id order by fp.created_at desc limit 1) as latest_author
      from forum_topics t
      join "user" u on u.id=t.user_id
      left join forum_posts p on p.topic_id=t.id
      group by t.id,u.name,u.image
      order by t.updated_at desc
      limit 100
    `;
  });

export const getForumThread = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((data: unknown) => z.object({ topicId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const topics = await sql`select t.id,t.title,t.category,t.created_at,t.updated_at,t.is_locked,t.user_id,u.name as author_name,u.image as author_image
      from forum_topics t join "user" u on u.id=t.user_id where t.id=${data.topicId} limit 1`;
    if (!topics[0]) throw new Error("TOPIC_NOT_FOUND");
    const posts = await sql`select p.id,p.body,p.created_at,p.edited_at,p.user_id,u.name as author_name,u.image as author_image
      from forum_posts p join "user" u on u.id=p.user_id where p.topic_id=${data.topicId}
      order by p.created_at asc limit 500`;
    return { topic: topics[0], posts };
  });

export const createForumTopic = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => topicInput.parse(data))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = randomUUID();
    await sql`insert into forum_topics(id,user_id,title,category) values(${id},${context.userId},${data.title},${data.category})`;
    await sql`insert into forum_posts(id,topic_id,user_id,body) values(${randomUUID()},${id},${context.userId},${data.body})`;
    await sql`insert into loot_point_ledger(user_id,points,reason,source_key)
      select ${context.userId},10,'Started a forum discussion',${"forum-topic:" + id}
      where (select coalesce(sum(points),0) from loot_point_ledger
        where user_id=${context.userId} and created_at >= date_trunc('day',now())) < 50
      on conflict(source_key) do nothing`;
    return { id };
  });

export const createForumPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => postInput.parse(data))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const topics = await sql`select id,is_locked from forum_topics where id=${data.topicId} limit 1`;
    if (!topics[0]) throw new Error("TOPIC_NOT_FOUND");
    if (topics[0].is_locked) throw new Error("TOPIC_LOCKED");
    const id = randomUUID();
    await sql`insert into forum_posts(id,topic_id,user_id,body) values(${id},${data.topicId},${context.userId},${data.body})`;
    await sql`update forum_topics set updated_at=now() where id=${data.topicId}`;
    await sql`insert into loot_point_ledger(user_id,points,reason,source_key)
      select ${context.userId},2,'Replied to a forum discussion',${"forum-reply:" + id}
      where (select coalesce(sum(points),0) from loot_point_ledger
        where user_id=${context.userId} and created_at >= date_trunc('day',now())) < 50
      on conflict(source_key) do nothing`;
    return { id };
  });

export const deleteForumPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => z.object({ postId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql`delete from forum_posts where id=${data.postId} and user_id=${context.userId} returning topic_id`;
    if (!rows[0]) throw new Error("POST_NOT_FOUND_OR_NOT_YOURS");
    await sql`update forum_topics set updated_at=now() where id=${rows[0].topic_id}`;
    return { ok: true };
  });


export const getMyLootPoints = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const [summary] = await sql`select coalesce(sum(points),0)::int as balance from loot_point_ledger where user_id=${context.userId}`;
    const history = await sql`select points,reason,created_at from loot_point_ledger where user_id=${context.userId} order by created_at desc limit 100`;
    return { balance: summary?.balance ?? 0, history };
  });
