import { redirect } from "next/navigation";
import Dashboard from "../dashboard";
import { chatGPTSignOutPath } from "../chatgpt-auth";
import { currentWeek } from "../../lib/club";
import { getClubSession } from "../../lib/club-session";

export const dynamic = "force-dynamic";

export default async function ParentPage() {
  const actor = await getClubSession();
  if (actor.role === "owner" || actor.role === "teacher") redirect("/teacher");
  if (actor.role !== "parent") redirect("/");
  return <Dashboard currentDate={currentWeek()} role="parent" signOut={chatGPTSignOutPath()} />;
}
