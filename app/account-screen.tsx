import { Compass, LockKeyhole } from "lucide-react";
import { chatGPTSignInPath, chatGPTSignOutPath } from "./chatgpt-auth";

export default function AccountScreen({ unassigned = false }: { unassigned?: boolean }) {
  return <main className="account-screen">
    <section className="panel account-card">
      <span className="brand-icon"><Compass size={26} aria-hidden="true" /></span>
      <h1>Bubbly Adventure Club</h1>
      {unassigned ? <>
        <p><LockKeyhole size={17} aria-hidden="true" /> This account hasn’t been assigned a child or a nursery group.</p>
        <p>Ask the nursery owner to check the email used for your invitation and account assignment.</p>
        <a className="secondary" href={chatGPTSignOutPath()} target="_top">Use a different account</a>
      </> : <>
        <p>Sign in with the email your nursery used for your invitation.</p>
        <a className="primary" href={chatGPTSignInPath("/")} target="_top">Continue with ChatGPT</a>
      </>}
    </section>
  </main>;
}
