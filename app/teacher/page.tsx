import { redirect } from "next/navigation";
import Dashboard from "../dashboard";
import { chatGPTSignOutPath } from "../chatgpt-auth";
import { currentWeek } from "../../lib/club";
import { getClubSession } from "../../lib/club-session";

export const dynamic = "force-dynamic";

export default async function TeacherPage() {
  const actor = await getClubSession();
  if (actor.role === "parent") redirect("/parent");
  if (actor.role !== "owner" && actor.role !== "teacher") redirect("/");
  return <Dashboard currentDate={currentWeek()} role={actor.role} signOut={chatGPTSignOutPath()} />;
}
