import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { sourceIds } from "@/domain";
import { sourceTag } from "@/lib/domain";

const requestSchema = z.object({ sourceIds: z.array(z.enum(sourceIds as [string, ...string[]])).min(1) });

function authorized(header: string | null, secret: string) {
  const given = Buffer.from(header ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Marks the cached data of the given Sources as stale (today only the Overview is cached;
 * Source pages read the database on each request), so the next visit rebuilds it.
 * Called by collection after it ingests, with `Authorization: Bearer $REVALIDATE_SECRET`.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return Response.json({ error: "REVALIDATE_SECRET is not set" }, { status: 503 });
  if (!authorized(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "expected { sourceIds: [known Source ids] }" }, { status: 400 });

  for (const sourceId of parsed.data.sourceIds) revalidateTag(sourceTag(sourceId), "max");
  return Response.json({ revalidated: parsed.data.sourceIds });
}
