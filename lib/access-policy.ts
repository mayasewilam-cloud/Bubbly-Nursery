import { z } from "zod/v4";
import { emptyClub, groups, hasFamilyUpdate, hasMissionProgress, type Child, type Club } from "./club";

export const accountEmail = z.string().trim().toLowerCase().pipe(z.email().max(254));
const childId = z.string().regex(/^[a-zA-Z0-9-]{1,45}$/);
export const assignmentSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("teacher"), groups: z.array(z.enum(groups)).min(1).max(groups.length) }),
  z.object({ role: z.literal("parent"), childIds: z.array(childId).min(1).max(150) }),
]);

export type Assignment = z.infer<typeof assignmentSchema>;
export type ClubRole = "owner" | Assignment["role"];
export type AccessEntry = { email: string; assignment: Assignment };
export type TeacherAssignment = Extract<Assignment, { role: "teacher" }>;

function scopeRecords<T>(records: Record<string, T>, ids: Set<string>): Record<string, T> {
  return Object.fromEntries(Object.entries(records).filter(([key]) => ids.has(key.split(":")[0])));
}

function plansForGroups(plans: Club["learningPlans"], allowedGroups: readonly Child["group"][]) {
  return Object.fromEntries(Object.entries(plans).filter(([key]) => allowedGroups.some(group => key.endsWith(`:${group}`))));
}

export function clubForAssignment(club: Club, assignment: Assignment): Club {
  const children = assignment.role === "teacher"
    ? club.children.filter(child => assignment.groups.includes(child.group))
    : club.children.filter(child => assignment.childIds.includes(child.id));
  const scope = new Set(children.map(child => child.id));
  const records = scopeRecords(club.records, scope);
  const reviews = scopeRecords(club.reviews, scope);
  const weeklyUpdates = scopeRecords(club.weeklyUpdates, scope);

  if (assignment.role === "teacher") {
    return { children, records, reviews, weeklyUpdates, weeks: club.weeks, learningPlans: plansForGroups(club.learningPlans, assignment.groups) };
  }

  const familyRecords = Object.fromEntries(Object.entries(records).filter(([, entry]) => hasMissionProgress(entry)));
  const familyReviews = Object.fromEntries(Object.entries(reviews).map(([key, review]) => [key, {
    observation: review.observation,
    nextStep: review.nextStep,
    targets: review.targets.map(({ topic, status, response }) => ({ topic, status, response, prompt: "" })),
  }]));
  const familyUpdates = Object.fromEntries(Object.entries(weeklyUpdates).flatMap(([key, update]) => (
    hasFamilyUpdate(update) ? [[key, { familyNote: update.familyNote, homeIdea: update.homeIdea, teacherNote: "" }]] : []
  )));
  const dates = new Set([...Object.keys(familyRecords), ...Object.keys(familyReviews), ...Object.keys(familyUpdates)]
    .map(key => key.split(":")[1]));

  return {
    ...emptyClub, children, records: familyRecords, reviews: familyReviews, weeklyUpdates: familyUpdates,
    weeks: club.weeks.filter(week => dates.has(week.date)),
  };
}

export function mergeTeacherChanges(original: Club, submitted: Club, assignment: TeacherAssignment): Club | null {
  const scoped = clubForAssignment(original, assignment);
  if (JSON.stringify(scoped.children) !== JSON.stringify(submitted.children) ||
    JSON.stringify(scoped.weeks) !== JSON.stringify(submitted.weeks)) return null;

  const scope = new Set(scoped.children.map(child => child.id));
  const submittedKeys = [...Object.keys(submitted.records), ...Object.keys(submitted.reviews), ...Object.keys(submitted.weeklyUpdates)];
  if (submittedKeys.some(key => !scope.has(key.split(":")[0]))) return null;
  const learningPlans = plansForGroups(submitted.learningPlans, assignment.groups);
  if (Object.keys(learningPlans).length !== Object.keys(submitted.learningPlans).length) return null;

  return {
    ...original,
    records: { ...original.records, ...submitted.records },
    learningPlans: { ...original.learningPlans, ...learningPlans },
    reviews: { ...original.reviews, ...submitted.reviews },
    weeklyUpdates: { ...original.weeklyUpdates, ...submitted.weeklyUpdates },
  };
}
