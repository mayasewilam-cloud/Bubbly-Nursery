import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../app/chatgpt-auth";
import { getDb } from "../db";
import { clubAccess, clubs } from "../db/schema";
import { assignmentSchema, type Assignment } from "./access-policy";
import { clubSchema, emptyClub } from "./club";

export type ClubSession =
  | { role: "owner"; ownerId: string; email: string }
  | { role: Assignment["role"]; ownerId: string; email: string; assignment: Assignment; assignmentValue: string }
  | { role: "unassigned" }
  | { role: "signed-out" };

export async function getClubSession(): Promise<ClubSession> {
  const user = await getChatGPTUser();
  if (!user) {
    return env.BUBBLY_LOCAL_PREVIEW === "1"
      ? { role: "owner", ownerId: "local-preview", email: "owner@example.test" }
      : { role: "signed-out" };
  }
  const email = user.email.trim().toLowerCase();
  if (email && email === env.BUBBLY_OWNER_EMAIL?.trim().toLowerCase()) {
    return { role: "owner", ownerId: user.userId, email };
  }

  const row = await getDb().select().from(clubAccess).where(eq(clubAccess.email, email)).get();
  if (!row) return { role: "unassigned" };
  const parsed = assignmentSchema.safeParse(JSON.parse(row.assignment));
  if (!parsed.success) return { role: "unassigned" };
  return { role: parsed.data.role, ownerId: row.owner, email, assignment: parsed.data, assignmentValue: row.assignment };
}

export async function getClubSnapshot(ownerId: string) {
  const row = await getDb().select().from(clubs).where(eq(clubs.owner, ownerId)).get();
  return row ? { revision: row.revision, document: clubSchema.parse(JSON.parse(row.document)) }
    : { revision: 0, document: emptyClub };
}

export const privateJson = (data: object, status = 200) => Response.json(data, {
  status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
});

export function isAppMutation(request: Request) {
  const type = request.headers.get("content-type")?.split(";")[0].trim();
  const origin = request.headers.get("origin");
  return type === "application/json" && request.headers.get("sec-fetch-site") !== "cross-site"
    && (!origin || origin === new URL(request.url).origin);
}

export async function listClubAccounts(owner: string) {
  const rows = await getDb().select().from(clubAccess).where(eq(clubAccess.owner, owner)).orderBy(clubAccess.email);
  return rows.map(row => ({ email: row.email, assignment: assignmentSchema.parse(JSON.parse(row.assignment)) }));
}
