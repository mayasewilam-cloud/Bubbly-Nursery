import { redirect } from "next/navigation";
import { getClubSession } from "../lib/club-session";
import AccountScreen from "./account-screen";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await getClubSession();
  if (actor.role === "parent") redirect("/parent");
  if (actor.role === "owner" || actor.role === "teacher") redirect("/teacher");
  return <AccountScreen unassigned={actor.role === "unassigned"} />;
}
