import { z } from "zod/v4";

export const groups = ["Pre-KG", "KG1"] as const;
export const avatars = ["🐻", "🦋", "🦁", "🐰", "🐝", "🐸", "🌈", "⭐"] as const;
export const consentLabels = { pending: "Awaiting consent", granted: "Consent recorded", declined: "Consent declined" };
export const participation = ["Joined in", "With support", "Independently"] as const;
export const reviewStatuses = ["unassessed", "independent", "supported", "not-observed"] as const;
export const reviewStatusLabels = {
  unassessed: "Still to observe", independent: "Independently", supported: "With support", "not-observed": "Not observed today",
};
export const maxLearningTargets = 8;
export const emojis = ["🌈", "🚂", "🔤", "🎨", "🌦️", "🧸", "📚", "🐾", "💛", "🦋", "🐠", "🌱", "🚀", "🦕", "♻️"] as const;
const id = z.string().regex(/^[a-zA-Z0-9-]{1,45}$/);
const date = z.iso.date();
const shortText = z.string().trim().min(1).max(80);
export const childSchema = z.object({
  id, name: z.string().trim().min(1).max(45), group: z.enum(groups),
  avatar: z.enum(avatars), consent: z.enum(["pending", "granted", "declined"]),
});
const missionSchema = z.object({
  title: shortText, icon: z.enum(emojis), category: z.string().trim().min(1).max(40),
  outcome: z.string().trim().min(1).max(200),
});
export const weekSchema = z.object({
  date, title: shortText, missions: z.array(missionSchema).length(9),
});
export const entrySchema = z.object({
  completed: z.boolean(), participation: z.enum(participation), note: z.string().trim().max(600),
});
const targetSchema = z.object({
  topic: shortText, prompt: z.string().trim().min(1).max(240),
});
export const learningPlanSchema = z.array(targetSchema).min(1).max(maxLearningTargets);
const reviewedTargetSchema = targetSchema.extend({
  status: z.enum(reviewStatuses), response: z.string().trim().max(400),
});
export const reviewSchema = z.object({
  targets: z.array(reviewedTargetSchema).min(1).max(maxLearningTargets),
  observation: z.string().trim().max(600), nextStep: z.string().trim().max(400),
});
export const weeklyUpdateSchema = z.object({
  familyNote: z.string().trim().max(800),
  homeIdea: z.string().trim().max(400),
  teacherNote: z.string().trim().max(800),
});
const childWeekKey = z.string().regex(/^[a-zA-Z0-9-]{1,45}:\d{4}-\d{2}-\d{2}$/);
export const clubSchema = z.object({
  children: z.array(childSchema).max(150),
  weeks: z.array(weekSchema).max(180),
  records: z.record(z.string().regex(/^[a-zA-Z0-9-]{1,45}:\d{4}-\d{2}-\d{2}:[0-8]$/), entrySchema),
  learningPlans: z.record(z.string().regex(/^\d{4}-\d{2}-\d{2}:(Pre-KG|KG1)$/), learningPlanSchema).default({}),
  reviews: z.record(childWeekKey, reviewSchema).default({}),
  weeklyUpdates: z.record(childWeekKey, weeklyUpdateSchema).default({}),
});
export const updateSchema = z.object({
  revision: z.number().int().nonnegative(), document: clubSchema,
});
export type Child = z.infer<typeof childSchema>;
export type Week = z.infer<typeof weekSchema>;
export type Mission = z.infer<typeof missionSchema>;
export type Entry = z.infer<typeof entrySchema>;
export type LearningTarget = z.infer<typeof targetSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type WeeklyUpdate = z.infer<typeof weeklyUpdateSchema>;
export type Club = z.infer<typeof clubSchema>;
export const emptyClub: Club = { children: [], weeks: [], records: {}, learningPlans: {}, reviews: {}, weeklyUpdates: {} };
export const emptyEntry: Entry = { completed: false, participation: "Joined in", note: "" };
export const emptyWeeklyUpdate: WeeklyUpdate = { familyNote: "", homeIdea: "", teacherNote: "" };
export const hasFamilyUpdate = (update: WeeklyUpdate) => Boolean(update.familyNote || update.homeIdea);
export const hasReviewEvidence = (target: Review["targets"][number]) => target.status !== "unassessed" || Boolean(target.response.trim());
export const missionKey = (child: string, date: string, index: number) => `${child}:${date}:${index}`;
export const hasMissionProgress = (entry: Entry) => entry.completed || Boolean(entry.note) || entry.participation !== emptyEntry.participation;
export const reviewKey = (child: string, date: string) => `${child}:${date}`;
export const learningPlanKey = (date: string, group: Child["group"]) => `${date}:${group}`;
export const starterTargets: Record<Child["group"], LearningTarget[]> = {
  "Pre-KG": [
    { topic: "Listening & pointing", prompt: "Offer two real objects. Say ‘Show me the ball’ and wait for a look, reach or point." },
    { topic: "Colours", prompt: "Give the child a red toy and two baskets. Model putting one red toy in the red basket." },
    { topic: "Animal actions", prompt: "Show a picture of a cat. Invite the child to copy a sound or movement." },
    { topic: "Simple instructions", prompt: "Offer a toy and a box. Ask the child to put the toy in the box." },
  ],
  KG1: [
    { topic: "Colours", prompt: "Offer red, blue, yellow and green objects. Ask ‘Show me blue. What colour is this?’" },
    { topic: "Letters & sounds", prompt: "Offer familiar letters A, B, C, D, I, E, P or N. Ask them to find one after hearing its sound." },
    { topic: "Animals", prompt: "Show pictures of a lion, cat, cow and monkey. Ask the child to find the lion and then name one animal." },
    { topic: "Size & everyday concepts", prompt: "Offer big and small blocks. Ask the child to show you the big block during play." },
  ],
};
export const missions: Mission[] = [
  { title: "Colour Sorting Market", icon: "🌈", category: "Colours & sorting", outcome: "Match objects by colour and practise naming familiar colours." },
  { title: "My Name Train", icon: "🚂", category: "Name recognition", outcome: "Recognise their name card and find the first letter with support when needed." },
  { title: "Feed the Letter Monster", icon: "🔤", category: "Early language", outcome: "Listen for a familiar letter sound and match, point to or name the letter." },
  { title: "Friendship Handprint Garden", icon: "🎨", category: "Creative play", outcome: "Explore colour and hand movements while contributing to a shared picture." },
  { title: "Weather Makers Studio", icon: "🌦️", category: "Understanding the world", outcome: "Connect simple weather words to pictures, gestures and what they notice outside." },
  { title: "In, On, Out of the Box", icon: "🧸", category: "Listening & movement", outcome: "Follow a short instruction using in, on or out with a toy." },
  { title: "Story Basket Circle", icon: "📚", category: "Stories & language", outcome: "Listen and respond to a story by choosing or naming a prop." },
  { title: "Animal Action Parade", icon: "🐾", category: "Movement & imitation", outcome: "Copy an animal movement or sound and practise stopping on cue." },
  { title: "Kindness Circle", icon: "💛", category: "Social play", outcome: "Practise taking turns and notice a friend's contribution." },
];

export function recordedMissionSlots(records: Club["records"], date: string) {
  const slots = new Set<number>();
  for (const [key, entry] of Object.entries(records)) {
    const [, week, index] = key.split(":");
    if (week === date && hasMissionProgress(entry)) slots.add(Number(index));
  }
  return slots;
}

export function changesRecordedMission(previous: Club, next: Club) {
  const before = new Map(previous.weeks.map(week => [week.date, week.missions]));
  const after = new Map(next.weeks.map(week => [week.date, week.missions]));
  const dates = new Set([...before.keys(), ...after.keys()]);
  for (const date of dates) {
    const oldMissions = before.get(date) ?? missions;
    const newMissions = after.get(date) ?? missions;
    if (JSON.stringify(oldMissions) === JSON.stringify(newMissions)) continue;
    for (const index of recordedMissionSlots(previous.records, date)) {
      if (JSON.stringify(oldMissions[index]) !== JSON.stringify(newMissions[index])) return true;
    }
  }
  return false;
}

export function cairoDate() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts();
  const get = (kind: string) => parts.find(({type}) => type === kind)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function shiftDate(value: string, days: number) {
  const day = new Date(`${value}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}
export function currentWeek() {
  const date = cairoDate();
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return shiftDate(date, -((day + 6) % 7));
}
export function weekLabel(date: string) {
  const format = (value: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
  const last = shiftDate(date, 6);
  const from = date.slice(0, 7) === last.slice(0, 7) ? {day: "numeric" as const} : {day: "numeric" as const, month: "short" as const};
  return `${format(date, from)}–${format(last, {day: "numeric", month: "short", year: "numeric"})}`;
}
