import { redirect } from "next/navigation";
import { getClubSession, getClubSnapshot, listClubAccounts } from "../../lib/club-session";
import { chatGPTSignOutPath } from "../chatgpt-auth";
import AccessManager from "./access-manager";

export const dynamic = "force-dynamic";

export default async function AccessPage() {
  const actor = await getClubSession();
  if (actor.role !== "owner") redirect("/");
  const [{ document }, accounts] = await Promise.all([
    getClubSnapshot(actor.ownerId), listClubAccounts(actor.ownerId),
  ]);
  const children = document.children.map(({ id, name, group }) => ({ id, name, group }));
  return <AccessManager initialAccounts={accounts} children={children} signOut={chatGPTSignOutPath()} />;
}
