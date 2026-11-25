"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Compass, GraduationCap, Heart, LockKeyhole, Plus } from "lucide-react";
import { accountEmail, type AccessEntry, type Assignment } from "../../lib/access-policy";
import { groups, type Child } from "../../lib/club";

type RosterChild = Pick<Child, "id" | "name" | "group">;

export default function AccessManager({ initialAccounts, children, signOut }: {
  initialAccounts: AccessEntry[];
  children: RosterChild[];
  signOut: string;
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Assignment["role"]>("parent");
  const [selectedGroups, setSelectedGroups] = useState<Child["group"][]>([]);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [removeEmail, setRemoveEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const inactive = !ready || busy;
  useEffect(() => setReady(true), []);

  function clear() {
    setEmail("");
    setEditing(false);
    setRole("parent");
    setSelectedGroups([]);
    setSelectedChildren([]);
    setError("");
  }

  function edit(account: AccessEntry) {
    setEmail(account.email);
    setRole(account.assignment.role);
    setSelectedGroups(account.assignment.role === "teacher" ? account.assignment.groups : []);
    setSelectedChildren(account.assignment.role === "parent" ? account.assignment.childIds : []);
    setEditing(true);
    setRemoveEmail("");
    setError("");
    setMessage("");
    document.getElementById("access-form-heading")?.scrollIntoView({ block: "start" });
  }

  async function request(method: "PUT" | "DELETE", body: { email: string; assignment?: Assignment }) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/access", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const result = await response.json() as { error?: string; accounts?: AccessEntry[] };
      if (!response.ok || !result.accounts) throw new Error(result.error || "The assignment could not be saved.");
      setAccounts(result.accounts);
      return true;
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "The assignment could not be saved.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inactive) return;
    const parsedEmail = accountEmail.safeParse(email);
    if (!parsedEmail.success) { setError("Enter the email this person uses to sign in."); return; }
    if (!editing && accounts.some(account => account.email === parsedEmail.data)) {
      setError("That email already has an assignment. Choose Edit beside it.");
      return;
    }
    const assignment: Assignment = role === "teacher" ? { role, groups: selectedGroups } : { role, childIds: selectedChildren };
    if (await request("PUT", { email: parsedEmail.data, assignment })) {
      clear();
      setMessage("Assignment saved. The same email needs a private Site invitation.");
    }
  }

  async function remove(account: string) {
    if (inactive) return;
    if (await request("DELETE", { email: account })) {
      if (email === account) clear();
      setRemoveEmail("");
      setMessage("Bubbly access removed. You can remove the Site invitation in Share.");
    }
  }

  const childNames = new Map(children.map(child => [child.id, child.name]));

  return <main className="access-page">
    <header className="access-top">
      <a className="portal-brand" href="/teacher"><Compass size={22} aria-hidden="true" /> <strong>Bubbly</strong><span>Adventure Club</span></a>
      <div><a className="secondary" href="/teacher">Teacher workspace</a><a className="secondary" href={signOut} target="_top">Sign out</a></div>
    </header>
    <div className="access-content">
      <div className="page-head"><div><h1>Manage access</h1><p>Choose which children or groups each account can open.</p></div></div>
      <section className="panel access-guide" aria-label="Private invitations">
        <span className="tiny-icon lilac"><LockKeyhole size={18} aria-hidden="true" /></span>
        <div>
          <h2>Private invitations</h2>
          <p>Save the assignment here, then invite the same email as a viewer from the Site’s Share settings. After signing in with ChatGPT, each person opens their assigned workspace.</p>
        </div>
      </section>
      {error && <p className="banner error" role="alert">{error}</p>}
      {message && <p className="access-message" role="status">{message}</p>}
      <div className="access-grid">
        <section className="panel access-form-panel">
          <h2 id="access-form-heading">{editing ? "Edit assignment" : "Assign an account"}</h2>
          <form onSubmit={save}>
            <label>Sign-in email
              <input type="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254}
                placeholder="name@example.com" autoComplete="off" readOnly={editing} disabled={inactive} />
            </label>
            <label>Role
              <select value={role} disabled={inactive} onChange={event => setRole(event.target.value as typeof role)}>
                <option value="parent">Parent</option>
                <option value="teacher">Teacher</option>
              </select>
            </label>
            {role === "teacher" ? <fieldset>
              <legend>Groups they teach</legend>
              {groups.map(group => <label className="access-option" key={group}>
                <input type="checkbox" disabled={inactive} checked={selectedGroups.includes(group)} onChange={event =>
                  setSelectedGroups(event.target.checked ? [...selectedGroups, group] : selectedGroups.filter(item => item !== group))} />
                <span>{group}</span>
              </label>)}
            </fieldset> : <fieldset>
              <legend>Their children</legend>
              {children.length === 0 && <p className="form-hint">Add an explorer in the Teacher workspace first.</p>}
              <div className="access-roster">
                {children.map(child => <label className="access-option" key={child.id}>
                  <input type="checkbox" disabled={inactive} checked={selectedChildren.includes(child.id)} onChange={event =>
                    setSelectedChildren(event.target.checked ? [...selectedChildren, child.id] : selectedChildren.filter(id => id !== child.id))} />
                  <span>{child.name} <small>{child.group}</small></span>
                </label>)}
              </div>
            </fieldset>}
            <div className="form-actions">
              {editing && <button type="button" className="secondary" onClick={clear} disabled={inactive}>Cancel edit</button>}
              <button className="primary" disabled={inactive || (role === "parent" ? !selectedChildren.length : !selectedGroups.length)} type="submit">
                <Plus size={16} aria-hidden="true" /> Save assignment
              </button>
            </div>
          </form>
        </section>
        <section className="panel access-list-panel">
          <h2>Assigned accounts</h2>
          {accounts.length === 0 ? <p>No parent or teacher accounts have been assigned yet.</p> : <ul className="account-list">
            {accounts.map(account => <li key={account.email}>
              <span className={`tiny-icon ${account.assignment.role === "parent" ? "mint" : "lilac"}`}>
                {account.assignment.role === "parent" ? <Heart size={17} aria-hidden="true" /> : <GraduationCap size={17} aria-hidden="true" />}
              </span>
              <div>
                <strong>{account.email}</strong>
                <p>{account.assignment.role === "teacher"
                  ? `Teacher · ${account.assignment.groups.join(", ")}`
                  : `Parent · ${account.assignment.childIds.map(id => childNames.get(id) ?? "Unavailable profile").join(", ")}`}</p>
                {removeEmail === account.email
                  ? <div className="access-account-actions"><button disabled={inactive} className="secondary" onClick={() => setRemoveEmail("")}>Cancel</button><button disabled={inactive} className="primary" onClick={() => void remove(account.email)}>Confirm removal</button></div>
                  : <div className="access-account-actions"><button disabled={inactive} className="text-button" onClick={() => edit(account)}>Edit</button><button disabled={inactive} className="text-button" onClick={() => setRemoveEmail(account.email)}>Remove access</button></div>}
              </div>
            </li>)}
          </ul>}
        </section>
      </div>
    </div>
  </main>;
}
