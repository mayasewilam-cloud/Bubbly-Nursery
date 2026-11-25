import { and, eq, exists } from "drizzle-orm";
import { getDb } from "../../../db";
import { clubAccess, clubs } from "../../../db/schema";
import { clubForAssignment, mergeTeacherChanges } from "../../../lib/access-policy";
import { changesRecordedMission, updateSchema } from "../../../lib/club";
import { getClubSession, getClubSnapshot, isAppMutation, privateJson } from "../../../lib/club-session";

export const dynamic = "force-dynamic";
const sizeLimit = 1_500_000;
const conflict = () => privateJson({ error: "Changes were saved elsewhere. Your view was refreshed. Please try again." }, 409);

export async function GET() {
  const actor = await getClubSession();
  if (actor.role === "signed-out") return privateJson({ error: "Sign in to open the club." }, 401);
  if (actor.role === "unassigned") return privateJson({ error: "This account needs a Bubbly assignment." }, 403);
  const snapshot = await getClubSnapshot(actor.ownerId);
  return privateJson(actor.role === "owner"
    ? snapshot
    : { revision: snapshot.revision, document: clubForAssignment(snapshot.document, actor.assignment) });
}

export async function PUT(request: Request) {
  const actor = await getClubSession();
  if (actor.role === "signed-out") return privateJson({ error: "Sign in to save changes." }, 401);
  if (actor.role === "parent" || actor.role === "unassigned") return privateJson({ error: "This account has read-only access." }, 403);
  if (!isAppMutation(request)) return privateJson({ error: "This request could not be accepted." }, 403);

  const body = await request.text();
  if (new TextEncoder().encode(body).length > sizeLimit) {
    return privateJson({ error: "The club record has reached its storage limit." }, 413);
  }
  let json: unknown;
  try { json = JSON.parse(body); } catch { return privateJson({ error: "The changes could not be read." }, 400); }
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) return privateJson({ error: "Check the information you entered and try again." }, 400);

  const { revision } = parsed.data;
  const previous = await getClubSnapshot(actor.ownerId);
  if (previous.revision !== revision) return conflict();

  let document = parsed.data.document;
  const db = getDb();
  let permission;
  if (actor.role === "teacher") {
    if (actor.assignment.role !== "teacher") return privateJson({ error: "This account needs a teacher assignment." }, 403);
    if (revision === 0) return privateJson({ error: "The owner needs to add explorers first." }, 422);
    const merged = mergeTeacherChanges(previous.document, document, actor.assignment);
    if (!merged) return privateJson({ error: "Teachers can save progress, topics and notes for their assigned groups." }, 403);
    document = merged;
    permission = exists(db.select({ email: clubAccess.email }).from(clubAccess).where(and(
      eq(clubAccess.email, actor.email), eq(clubAccess.owner, actor.ownerId), eq(clubAccess.assignment, actor.assignmentValue),
    )));
  } else if (actor.role === "owner" && changesRecordedMission(previous.document, document)) {
    return privateJson({ error: "This mission already has progress. Choose an unused mission or a different week." }, 422);
  }

  const next = { revision: revision + 1, document: JSON.stringify(document) };
  if (new TextEncoder().encode(next.document).length > sizeLimit) {
    return privateJson({ error: "The club record has reached its storage limit." }, 413);
  }
  const saved = revision === 0
    ? await db.insert(clubs).values({ owner: actor.ownerId, ...next }).onConflictDoNothing().returning({ revision: clubs.revision })
    : await db.update(clubs).set(next).where(and(eq(clubs.owner, actor.ownerId), eq(clubs.revision, revision), permission)).returning({ revision: clubs.revision });
  if (saved.length === 0) return conflict();
  return privateJson({ revision: saved[0].revision });
}
