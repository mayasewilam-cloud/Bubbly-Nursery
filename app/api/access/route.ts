import { and, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { getDb } from "../../../db";
import { clubAccess } from "../../../db/schema";
import { accountEmail, assignmentSchema } from "../../../lib/access-policy";
import { getClubSession, getClubSnapshot, isAppMutation, listClubAccounts, privateJson } from "../../../lib/club-session";

export const dynamic = "force-dynamic";
const accountSchema = z.object({ email: accountEmail, assignment: assignmentSchema });
const emailSchema = z.object({ email: accountEmail });
const denied = () => privateJson({ error: "Only the site owner can manage accounts." }, 403);

export async function GET() {
  const actor = await getClubSession();
  return actor.role === "owner" ? privateJson({ accounts: await listClubAccounts(actor.ownerId) }) : denied();
}

export async function PUT(request: Request) {
  const actor = await getClubSession();
  if (actor.role !== "owner" || !isAppMutation(request)) return denied();
  const parsed = accountSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return privateJson({ error: "Enter a valid email and choose at least one group or child." }, 400);
  const { email, assignment } = parsed.data;
  if (email === actor.email) return privateJson({ error: "The owner already has full access." }, 400);
  if (assignment.role === "parent") {
    const { document } = await getClubSnapshot(actor.ownerId);
    const roster = new Set(document.children.map(child => child.id));
    if (assignment.childIds.some(id => !roster.has(id))) {
      return privateJson({ error: "Choose children from the current nursery roster." }, 400);
    }
  }
  const stored = JSON.stringify(assignment);
  const saved = await getDb().insert(clubAccess).values({ email, owner: actor.ownerId, assignment: stored })
    .onConflictDoUpdate({ target: clubAccess.email, set: { assignment: stored }, setWhere: eq(clubAccess.owner, actor.ownerId) })
    .returning({ email: clubAccess.email });
  if (!saved.length) return privateJson({ error: "That email is already assigned elsewhere." }, 409);
  return privateJson({ accounts: await listClubAccounts(actor.ownerId) });
}

export async function DELETE(request: Request) {
  const actor = await getClubSession();
  if (actor.role !== "owner" || !isAppMutation(request)) return denied();
  const parsed = emailSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return privateJson({ error: "Enter a valid email." }, 400);
  await getDb().delete(clubAccess).where(and(eq(clubAccess.owner, actor.ownerId), eq(clubAccess.email, parsed.data.email)));
  return privateJson({ accounts: await listClubAccounts(actor.ownerId) });
}
