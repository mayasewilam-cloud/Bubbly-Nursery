"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  BookOpen, CalendarDays, Camera, Check, ChevronDown, ChevronLeft, ChevronRight,
  ClipboardList, Compass, House, IdCard, LockKeyhole, LogOut, MessageCircle, Pencil, Plus, Printer, Sparkles, Star, Users, X,
} from "lucide-react";
import {
  avatars, consentLabels, emojis, emptyClub, emptyEntry, groups, missionKey, missions,
  participation, learningPlanKey, learningPlanSchema, reviewKey, reviewSchema, starterTargets, hasMissionProgress, recordedMissionSlots,
  emptyWeeklyUpdate, hasFamilyUpdate, hasReviewEvidence, shiftDate, weekLabel, weeklyUpdateSchema,
  type Child, type Club, type Entry, type LearningTarget, type Review, type Week, type WeeklyUpdate,
} from "../lib/club";
import { LearningReviewForm, LearningPlanForm, PortfolioHistory, PortfolioReview } from "./learning";
import { Membership, MembershipSheets, StarGrid } from "./membership";
import ClassChecklist from "./class-checklist";
import { FamilyUpdate, PortalTabs, WeeklyUpdateForm, type Portal } from "./portal";
import type { ClubRole } from "../lib/access-policy";

type TeacherView = "missions" | "explorers" | "review" | "updates";
type View = TeacherView | "book";
type Modal = { kind: "child"; child?: Child } | { kind: "week" } | { kind: "note"; index: number } | { kind: "plan" } | { kind: "class" };
type PrintView = "mission" | "card" | "cards" | "book";
type Update = { revision: number; document: Club };

const sample: Child = { id: "sample", name: "Maya", group: "KG1", avatar: "🐻", consent: "pending" };
const sampleEntries: Record<number, Entry> = {
  0: { completed: true, participation: "Independently", note: "Maya sorted the red and yellow fruit and named both colours during play." },
  1: { completed: true, participation: "With support", note: "Maya found her name card after looking at the first letter together." },
  2: { completed: true, participation: "Joined in", note: "Maya fed the monster a letter and copied the sound with the group." },
};
const sampleReview: Review = {
  targets: [
    { ...starterTargets.KG1[0], status: "independent", response: "Named red and blue while choosing market baskets." },
    { ...starterTargets.KG1[1], status: "supported", response: "Pointed to A after choosing between two letter cards." },
    { ...starterTargets.KG1[2], status: "unassessed", response: "" },
    { ...starterTargets.KG1[3], status: "not-observed", response: "Chose to build a tower during the size activity." },
  ],
  observation: "Maya took turns with a friend during market play and used colour words while choosing the fruit.",
  nextStep: "Play a short picture game with two familiar letter sounds and wait for Maya to point.",
};
const sampleUpdate: WeeklyUpdate = {
  familyNote: "Maya loved choosing fruit for the rainbow market. She named red and blue as she filled her basket!",
  homeIdea: "Try a colour hunt together. Take turns finding something red in the room.",
  teacherNote: "Bring two colour baskets for the next session.",
};
const mood = ["pink", "peach", "lilac", "mint", "blue", "peach", "lilac", "mint", "pink"];
const navigation = [
  { id: "missions", icon: House, label: "Weekly Missions", short: "Missions" },
  { id: "explorers", icon: Users, label: "Little Explorers", short: "Explorers" },
  { id: "review", icon: ClipboardList, label: "Learning Reviews", short: "Reviews" },
  { id: "updates", icon: MessageCircle, label: "Weekly Updates", short: "Updates" },
] as const;
const pageTitles = {
  missions: { title: "Weekly Missions", description: "" },
  review: { title: "Weekly Learning Review", description: "Record what each explorer tried and what helped." },
  updates: { title: "Weekly Updates", description: "Write a message for the family and keep a note for your next session." },
  book: { title: "Adventure Book", description: "Activity highlights, learning notes and next steps." },
};

async function getClub(): Promise<Update> {
  const response = await fetch("/api/club", { cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(data?.error || "The saved club records could not be loaded. Try again.");
  }
  return response.json();
}

export default function Dashboard({ currentDate, role, signOut }: { currentDate: string; role: ClubRole; signOut: string }) {
  const isOwner = role === "owner";
  const parentOnly = role === "parent";
  const [club, setClub] = useState(emptyClub);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState(isOwner ? sample.id : "");
  const [sampleRecords, setSampleRecords] = useState<Record<string, Entry>>({});
  const [sampleReviews, setSampleReviews] = useState<Record<string, Review>>({});
  const [sampleUpdates, setSampleUpdates] = useState<Record<string, WeeklyUpdate>>({});
  const [updateDrafts, setUpdateDrafts] = useState<Record<string, WeeklyUpdate>>({});
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, Review>>({});
  const [date, setDate] = useState(currentDate);
  const [portal, setPortal] = useState<Portal>(parentOnly ? "parent" : "teacher");
  const [teacherView, setTeacherView] = useState<TeacherView>("missions");
  const [modal, setModal] = useState<Modal | null>(null);
  const [print, setPrint] = useState<PrintView | null>(null);
  const [printGroup, setPrintGroup] = useState<Child["group"] | "all">("all");
  const [showStars, setShowStars] = useState(false);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const submitLock = useRef(false);
  const isParent = parentOnly || portal === "parent";
  const view: View = isParent ? "book" : teacherView;
  const child = club.children.find(person => person.id === selected) ?? (isOwner && selected === sample.id ? sample : club.children[0] ?? sample);
  const demo = isOwner && child.id === sample.id;
  const savedWeek = club.weeks.find(item => item.date === date);
  const week: Week = savedWeek ?? { date, title: "Rainbow Discovery Day", missions };
  const entries = week.missions.map((_, index) => {
    const key = missionKey(child.id, date, index);
    return demo ? sampleRecords[key] ?? (date === currentDate ? sampleEntries[index] : undefined) ?? emptyEntry : club.records[key] ?? emptyEntry;
  });
  const earned = entries.filter(entry => entry.completed).length;
  const lockedMissions = modal?.kind === "week" ? recordedMissionSlots(club.records, date) : new Set<number>();
  const familyEntries = entries.flatMap((entry, index) =>
    hasMissionProgress(entry) ? [{ entry, mission: week.missions[index] }] : []);
  const bookWeek = savedWeek || familyEntries.length > 0 ? week : { ...week, title: "This week’s adventure" };
  const activeReviewKey = reviewKey(child.id, date);
  const activePlanKey = learningPlanKey(date, child.group);
  const targets = club.learningPlans[activePlanKey] ?? starterTargets[child.group];
  const review = demo ? sampleReviews[activeReviewKey] ?? (date === currentDate ? sampleReview : undefined) : club.reviews[activeReviewKey];
  const savedUpdates = demo ? sampleUpdates : club.weeklyUpdates;
  const weeklyUpdate = savedUpdates[activeReviewKey] ?? (demo && date === currentDate ? sampleUpdate : emptyWeeklyUpdate);
  const updateDraft = updateDrafts[activeReviewKey] ?? weeklyUpdate;
  const printableExplorers = printGroup === "all" ? club.children : club.children.filter(person => person.group === printGroup);
  const portfolioDates = new Set([currentDate, date]);
  if (view === "book") {
    for (const [key, entry] of Object.entries(demo ? sampleRecords : club.records)) {
      const [childId, weekDate] = key.split(":");
      if (childId === child.id && hasMissionProgress(entry)) portfolioDates.add(weekDate);
    }
    for (const key of Object.keys(demo ? sampleReviews : club.reviews)) {
      const [childId, weekDate] = key.split(":");
      if (childId === child.id) portfolioDates.add(weekDate);
    }
    for (const [key, update] of Object.entries(savedUpdates)) {
      const [childId, weekDate] = key.split(":");
      if (childId === child.id && hasFamilyUpdate(update)) portfolioDates.add(weekDate);
    }
  }
  const familyDates = Array.from(portfolioDates).sort().reverse();
  const familyWeekIndex = familyDates.indexOf(date);
  const previousWeek = isParent ? familyDates[familyWeekIndex + 1] : shiftDate(date, -7);
  const nextWeek = isParent ? familyDates[familyWeekIndex - 1] : shiftDate(date, 7);

  useEffect(() => {
    let alive = true;
    getClub().then(({ document, revision }) => {
      if (!alive) return;
      setClub(document);
      setRevision(revision);
      const saved = isOwner ? window.localStorage.getItem("bubbly-selected") : null;
      setSelected(saved === sample.id ? sample.id : document.children.find(person => person.id === saved)?.id ?? document.children[0]?.id ?? (isOwner ? sample.id : ""));
      setReady(true);
    }).catch(error => { if (alive) setFailure(error.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [isOwner]);

  function choose(id: string) {
    setSelected(id);
    if (parentOnly) setDate(currentDate);
    if (isOwner) window.localStorage.setItem("bubbly-selected", id);
  }

  function showPortal(next: Portal) {
    setPortal(next);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function go(to: View) {
    if (to !== "book") setTeacherView(to);
    showPortal(to === "book" ? "parent" : "teacher");
    if (to === "book" && isOwner) window.requestAnimationFrame(() => document.getElementById("portal-parent-tab")?.focus());
  }

  async function reload() {
    setLoading(true);
    setFailure("");
    try {
      const data = await getClub();
      setClub(data.document);
      setRevision(data.revision);
      setReady(true);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "The saved club records could not be loaded.");
    } finally { setLoading(false); }
  }

  async function save(document: Club) {
    if (parentOnly || !ready || submitLock.current) return false;
    submitLock.current = true;
    setSaving(true);
    setFailure("");
    setNotice("");
    try {
      const response = await fetch("/api/club", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision, document }),
      });
      const data = await response.json() as { error?: string; revision: number };
      if (response.status === 409) {
        const updated = await getClub();
        setClub(updated.document);
        setRevision(updated.revision);
      }
      if (!response.ok) throw new Error(data.error || "Your changes could not be saved. Try again.");
      setRevision(data.revision);
      setClub(document);
      return true;
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Your changes could not be saved. Try again.");
      return false;
    } finally { submitLock.current = false; setSaving(false); }
  }

  async function saveEntry(index: number, entry: Entry, message: string) {
    const key = missionKey(child.id, date, index);
    if (demo) setSampleRecords(previous => ({ ...previous, [key]: entry }));
    else if (!await save({ ...club, records: { ...club.records, [key]: entry } })) return false;
    setNotice(message);
    return true;
  }

  async function awardClassStars(index: number, explorerIds: string[]) {
    const records = { ...club.records };
    for (const id of explorerIds) {
      const key = missionKey(id, date, index);
      records[key] = { ...(records[key] ?? emptyEntry), completed: true };
    }
    return save({ ...club, records });
  }

  async function submitChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (modal?.kind !== "child") return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name")).trim();
    if (!name) { setFailure("Enter the child's first name or nickname."); return; }
    const value: Child = {
      id: modal.child?.id ?? crypto.randomUUID(), name,
      group: form.get("group") as Child["group"],
      avatar: form.get("avatar") as Child["avatar"],
      consent: form.get("consent") as Child["consent"],
    };
    const children = modal.child ? club.children.map(person => person.id === value.id ? value : person) : [...club.children, value];
    if (await save({ ...club, children })) {
      choose(value.id);
      setModal(null);
      go("missions");
      setNotice(modal.child ? "Explorer profile updated." : `${value.name}’s membership profile is ready.`);
    }
  }

  async function submitWeek(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title")).trim();
    const items = week.missions.map((mission, index) => lockedMissions.has(index) ? mission : ({
      title: String(form.get(`mission-${index}`)).trim(),
      icon: form.get(`icon-${index}`) as Week["missions"][number]["icon"],
      category: String(form.get(`category-${index}`)).trim(),
      outcome: String(form.get(`outcome-${index}`)).trim(),
    }));
    if (!title || items.some(item => !item.title || !item.category || !item.outcome)) {
      setFailure("Add a theme and fill in the title, skill and outcome for every mission.");
      return;
    }
    const weeks = [...club.weeks.filter(item => item.date !== date), { date, title, missions: items }];
    if (await save({ ...club, weeks })) { setModal(null); setNotice("Weekly mission sheet saved."); }
  }

  async function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (modal?.kind !== "note") return;
    const form = new FormData(event.currentTarget);
    const updated = {
      ...entries[modal.index],
      participation: form.get("participation") as Entry["participation"],
      note: String(form.get("note")).trim(),
    };
    if (await saveEntry(modal.index, updated, "Learning note saved.")) setModal(null);
  }

  async function saveReview(value: Review) {
    const parsed = reviewSchema.safeParse(value);
    if (!parsed.success) {
      setFailure("Check your learning review and try again.");
      return false;
    }
    if (!parsed.data.observation && !parsed.data.nextStep && !parsed.data.targets.some(hasReviewEvidence)) {
      setFailure("Record a response, observation or next step before saving the review.");
      return false;
    }
    if (demo) {
      setFailure("");
      setSampleReviews(previous => ({ ...previous, [activeReviewKey]: parsed.data }));
    } else if (!await save({ ...club, reviews: { ...club.reviews, [activeReviewKey]: parsed.data } })) return false;
    setReviewDrafts(previous => {
      const next = { ...previous };
      delete next[activeReviewKey];
      return next;
    });
    setNotice("Learning review saved to the Adventure Book.");
    return true;
  }

  async function saveLearningPlan(value: LearningTarget[]) {
    const parsed = learningPlanSchema.safeParse(value);
    if (!parsed.success) {
      setFailure("Enter a topic and a play prompt for every row.");
      return false;
    }
    if (!await save({ ...club, learningPlans: { ...club.learningPlans, [activePlanKey]: parsed.data } })) return false;
    setModal(null);
    setNotice(`${child.group} topics saved for this week.`);
    return true;
  }

  async function saveWeeklyUpdate() {
    const parsed = weeklyUpdateSchema.safeParse(updateDraft);
    if (!parsed.success) {
      setFailure("Check the weekly update and try again.");
      return;
    }
    const weeklyUpdates = { ...savedUpdates, [activeReviewKey]: parsed.data };
    if (demo) {
      setFailure("");
      setSampleUpdates(weeklyUpdates);
    } else if (!await save({ ...club, weeklyUpdates })) return;
    setUpdateDrafts(previous => {
      const next = { ...previous };
      delete next[activeReviewKey];
      return next;
    });
    setNotice("Weekly update saved.");
  }

  function openModal(value: Modal) {
    if (parentOnly || (!isOwner && (value.kind === "child" || value.kind === "week"))) return;
    setFailure("");
    setModal(value);
  }

  if (!isOwner && (!ready || !club.children.length)) {
    return <main className="account-screen">
      <section className="panel account-card">
        <span className="brand-icon"><Compass size={26} aria-hidden="true" /></span>
        <h1>{parentOnly ? "Family space" : "Teacher workspace"}</h1>
        {loading ? <p role="status">Loading your Bubbly space…</p> : failure ? <p role="alert">{failure}</p> :
          <p>{parentOnly ? "There are no children linked to your account. Ask the nursery owner to check your assignment." : "There are no explorers in your assigned groups yet."}</p>}
        {!loading && failure && <button className="primary" onClick={reload}>Retry</button>}
        <a className="secondary" href={signOut} target="_top">Sign out</a>
      </section>
    </main>;
  }

  const printContent = <>
      {print === "card" && <Membership child={child} demo={demo} printable />}
      {print === "cards" && <MembershipSheets explorers={printableExplorers} />}
      {print === "mission" && <div className="print-sheet">
        <PrintHeader title="My Weekly Mission Sheet" week={week} child={child} />
        <p>Colour, stamp or stick a star in each space after you join in.</p>
        <ol>{week.missions.map((mission, index) => <li key={index}><span><b>{mission.icon} {mission.title}</b><small>{mission.category}</small></span><Star fill={entries[index].completed ? "currentColor" : "none"} size={30} /></li>)}</ol>
        <p>{earned} of 9 stars collected</p>
      </div>}
      {print === "book" && <div className="print-sheet">
        <PrintHeader title="My Adventure Book" week={bookWeek} child={child} />
        <p>{earned} of 9 stars collected</p>
        {hasFamilyUpdate(weeklyUpdate) && <FamilyUpdate note={weeklyUpdate.familyNote} idea={weeklyUpdate.homeIdea} />}
        <PhotoPlaceholder child={child} />
        {review && <PortfolioReview review={review} />}
        {familyEntries.length === 0 && !review && !hasFamilyUpdate(weeklyUpdate) && <p>Learning notes and completed activities will appear here as the week progresses.</p>}
        {familyEntries.map(({ entry, mission }, index) => <article key={index}><h2>{mission.icon} {mission.title}</h2><p>{entry.participation} · {mission.outcome}</p>{entry.note && <p>{entry.note}</p>}</article>)}
      </div>}
  </>;

  return <>
    <div className={`app-shell ${isParent ? "parent-space" : "teacher-space"}`}>
      {!isParent && <aside className="sidebar">
        <button className="brand" onClick={() => go("missions")} aria-label="Bubbly Adventure Club home">
          <span className="brand-icon" aria-hidden="true"><Compass size={26} strokeWidth={2.4} /></span>
          <span><strong>Bubbly</strong><small>ADVENTURE CLUB</small></span>
        </button>
        <nav aria-label="Teacher tools">
          {navigation.map(({ id, icon: Icon, label, short }) => <button key={id} className={`nav-${id}`} onClick={() => go(id)} aria-label={label} aria-current={view === id ? "page" : undefined}>
            <span className="nav-icon"><Icon size={20} aria-hidden="true" /></span><span className="nav-label">{label}</span><span className="mobile-nav-label">{short}</span>
          </button>)}
        </nav>
        <div className="sidebar-end">
          <div className="side-private"><LockKeyhole size={16} aria-hidden="true" /><span>Private nursery space</span></div>
          <p>Bubbly Nursery</p>
        </div>
      </aside>}
      <main className="main">
        <header className="topbar">
          <div className="portal-heading">
            <span className="portal-brand"><Compass size={21} aria-hidden="true" /> <strong>Bubbly</strong><span>Adventure Club</span></span>
            {isOwner ? <>
              <PortalTabs current={portal} onChange={showPortal} />
              <a className="secondary manage-access" href="/access" aria-label="Manage access"><LockKeyhole size={16} aria-hidden="true" /> <span className="access-wide">Manage access</span><span className="access-short">Access</span></a>
            </> : <>
              <span className={`workspace-label ${isParent ? "family-space-label" : ""}`} id="active-workspace-label">
                {parentOnly ? "Family space" : isParent ? "Family preview" : "Teacher workspace"}
              </span>
              {!parentOnly && isParent && <button className="secondary" onClick={() => showPortal("teacher")}>Back to Teacher</button>}
              <a className="secondary sign-out" href={signOut} target="_top" aria-label="Sign out" title="Sign out"><LogOut size={17} aria-hidden="true" /><span>Sign out</span></a>
            </>}
          </div>
          {(!parentOnly || club.children.length > 1) && <div className="top-actions">
            {isParent && <label className="preview-label" htmlFor="portal-explorer">{parentOnly ? "Child" : "Preview child"}</label>}
            <div className="explorer-select">
              <span aria-hidden="true">{child.avatar}</span>
              <select id="portal-explorer" aria-label={parentOnly ? "Child" : isParent ? "Preview child" : "Active explorer"} value={child.id} onChange={event => choose(event.target.value)}>
                {isOwner && <option value={sample.id}>Maya (sample)</option>}
                {club.children.map(person => <option key={person.id} value={person.id}>{person.name} · {person.group}</option>)}
              </select>
              <ChevronDown size={15} aria-hidden="true" />
            </div>
            {!isParent && isOwner && <button className="primary add-button" disabled={!ready || saving} onClick={() => openModal({ kind: "child" })}><Plus size={18} /> <span>Add explorer</span></button>}
          </div>}
        </header>

        <div className="content" id={`portal-${portal}-panel`} role={isOwner ? "tabpanel" : undefined} aria-labelledby={isOwner ? `portal-${portal}-tab` : "active-workspace-label"} tabIndex={isOwner ? 0 : undefined}>
          {failure && !modal && <div className="banner error" role="alert">{failure} {!ready && <button className="secondary" onClick={reload}>Retry</button>}</div>}
          <div className="status-region" role="status" aria-live="polite">{loading ? "Loading saved club records…" : notice}</div>
          {view !== "explorers" && <div className="page-head">
            <div>
              <h1>{view === "book" ? <><bdi>{child.name}</bdi>’s {pageTitles.book.title}</> : pageTitles[view].title}</h1>
              {pageTitles[view].description && <p>{pageTitles[view].description}</p>}
            </div>
            <div className="week-control" aria-label="Activity week">
              <button aria-label="Previous week" disabled={!previousWeek} onClick={() => { if (previousWeek) setDate(previousWeek); }}><ChevronLeft size={18} /></button>
              <div><CalendarDays size={17} aria-hidden="true" /><span>{weekLabel(date)}</span></div>
              <button aria-label="Next week" disabled={!nextWeek} onClick={() => { if (nextWeek) setDate(nextWeek); }}><ChevronRight size={18} /></button>
            </div>
          </div>}

          {view === "missions" && <>
            <section className="hero">
              <div className="hero-text">
                <div className="hero-kicker"><Sparkles size={16} /> WEEKLY ADVENTURE</div>
                <h2>{week.title}</h2>
                <p>Ready, <bdi>{child.name}</bdi>? Let’s go exploring!</p>
                <div className="hero-actions">
                  <button className="primary" disabled={!ready || saving} onClick={() => openModal({ kind: "class" })}><Users size={18} /> Class checklist</button>
                  <button className="hero-button" onClick={() => setPrint("mission")}><Printer size={17} /> Print mission sheet</button>
                </div>
              </div>
              <img src="/explorer.webp" alt="" width="960" height="624" fetchPriority="high" />
            </section>

            <div className="dashboard-grid">
              <div className="mission-column">
                <section className="progress-panel" aria-label="Star progress">
                  <div className="progress-heading">
                    <div className="progress-icon"><Star size={22} fill="currentColor" /></div>
                    <div><h2>My Star Collection</h2>{earned === 9 && <p>You joined all nine missions!</p>}</div>
                    <button className="count-pill show-stars" aria-label="Show my stars" onClick={() => setShowStars(true)}>
                      <span><strong>{earned}</strong> / 9 stars</span><span><Sparkles size={13} /> Show stars</span>
                    </button>
                  </div>
                  <StarGrid count={earned} />
                </section>
                <section className="mission-section" aria-labelledby="mission-list-heading">
                  <div className="section-heading"><h2 id="mission-list-heading">Mission Checklist</h2>
                    {isOwner && <button className="text-button" disabled={!ready || saving} onClick={() => openModal({ kind: "week" })}><Pencil size={15} /> Edit week</button>}
                  </div>
                  <div className="mission-grid">
                    {week.missions.map((mission, index) => <article key={index} className={`mission-card tone-${mood[index]} ${entries[index].completed ? "complete" : ""}`}>
                      <div className="mission-main">
                        <span className={`activity-icon ${mood[index]}`} aria-hidden="true">{mission.icon}</span>
                        <div><h3>{mission.title}</h3><p>{mission.category}</p></div>
                      </div>
                      <div className="mission-actions">
                        <button className="mission-toggle" type="button" aria-pressed={entries[index].completed} aria-label={`${entries[index].completed ? "Undo" : "Complete"} ${mission.title}`} disabled={saving || (!demo && !ready)} onClick={() => {
                          const newEntry = { ...entries[index], completed: !entries[index].completed };
                          void saveEntry(index, newEntry, newEntry.completed ? `Star earned for ${mission.title}!` : `Star removed for ${mission.title}.`);
                        }}>
                          {entries[index].completed ? <Check size={16} strokeWidth={2.7} /> : <Star size={16} />} {entries[index].completed ? "Star earned" : "Add star"}
                        </button>
                        <button className={`note-button ${entries[index].note ? "has-note" : ""}`} aria-label={`Learning note for ${mission.title}`} title="Learning note" onClick={() => openModal({ kind: "note", index })}><Pencil size={17} /></button>
                      </div>
                    </article>)}
                  </div>
                </section>
              </div>
              <aside className="dashboard-aside">
                <section className="panel membership-panel">
                  <div className="aside-heading"><span className="tiny-icon lilac"><IdCard size={18} /></span><h2>Membership Card</h2></div>
                  <Membership child={child} demo={demo} />
                  <button className="secondary full" onClick={() => setPrint("card")}><Printer size={16} /> Print card</button>
                  {demo ? <p className="aside-note">Sample profile. Add an explorer to start a real record.</p> : isOwner && <button className="text-button full" onClick={() => openModal({ kind: "child", child })}><Pencil size={15} /> Edit profile</button>}
                </section>
                <section className="panel book-panel">
                  <div className="aside-heading"><span className="tiny-icon mint"><BookOpen size={18} /></span><h2>Adventure Book</h2></div>
                  <img src="/book-bear.webp" width="550" height="367" alt="" loading="lazy" />
                  <button className="secondary full" onClick={() => go("book")}>Preview Parent tab</button>
                  <button className="text-button full" onClick={() => go("updates")}><MessageCircle size={16} /> Write weekly update</button>
                </section>
              </aside>
            </div>
          </>}

          {view === "explorers" && <>
            <div className="page-head">
              <div><h1>Little Explorers</h1><p>Open a child’s missions or review for {weekLabel(date)}.</p></div>
              <button className="secondary" disabled={!ready || club.children.length === 0} onClick={() => { setPrintGroup("all"); setPrint("cards"); }}><Printer size={17} /> Print class cards</button>
            </div>
            <div className="profile-grid">
              {(isOwner ? [...club.children, sample] : club.children).map(person => <section className="panel profile-panel" key={person.id}>
                <Membership child={person} demo={person.id === sample.id} />
                <div className="profile-actions">
                  <button className="primary" onClick={() => { choose(person.id); go("missions"); }}>Open missions</button>
                  {isOwner && person.id !== sample.id && <button className="secondary" aria-label={`Edit ${person.name}’s profile`} onClick={() => openModal({ kind: "child", child: person })}><Pencil size={17} /> Edit</button>}
                </div>
                <button className="text-button profile-review-link" onClick={() => { choose(person.id); go("review"); }}>
                  <ClipboardList size={16} /> {club.reviews[reviewKey(person.id, date)] || (person.id === sample.id && (sampleReviews[reviewKey(person.id, date)] || date === currentDate)) ? "Open saved review" : "Start learning review"}
                </button>
              </section>)}
            </div>
          </>}

          {view === "review" && <LearningReviewForm child={child} targets={targets} review={review} draft={reviewDrafts[activeReviewKey]}
            onChange={value => setReviewDrafts(previous => ({ ...previous, [activeReviewKey]: value }))}
            saving={saving} canEditPlan={ready && !saving} canSave={ready || demo}
            onEditPlan={() => openModal({ kind: "plan" })} onSave={saveReview} />}

          {view === "updates" && <WeeklyUpdateForm child={child} date={date} value={updateDraft}
            saved={Boolean(savedUpdates[activeReviewKey])} dirty={JSON.stringify(updateDraft) !== JSON.stringify(weeklyUpdate)}
            demo={demo} saving={saving} canSave={ready || demo}
            onChange={value => setUpdateDrafts(previous => ({ ...previous, [activeReviewKey]: value }))}
            onSave={saveWeeklyUpdate} onPreview={() => go("book")} />}

          {view === "book" && <>
            <section className="book-hero panel">
              <div className="avatar big" aria-hidden="true">{child.avatar}</div>
              <div className="book-opening">{!parentOnly && <div className="hero-kicker">PARENT PREVIEW{demo && " · SAMPLE"}</div>}<h2>{bookWeek.title}</h2><p>{child.group} · {earned} of 9 stars</p></div>
              <img src="/book-bear.webp" width="550" height="367" alt="" />
              <button className="secondary" onClick={() => setPrint("book")}><Printer size={17} /> Print page</button>
              <div className="book-star-strip"><StarGrid count={earned} /></div>
            </section>
            <div className="dashboard-grid book-grid">
              <PortfolioHistory dates={familyDates} selectedDate={date} onSelect={setDate} />
              <section className="family-entries" aria-label="Activities and learning">
                {hasFamilyUpdate(weeklyUpdate) && <FamilyUpdate note={weeklyUpdate.familyNote} idea={weeklyUpdate.homeIdea} />}
                {review && <PortfolioReview review={review} />}
                {familyEntries.length > 0 && <h2 className="portfolio-activities-title">Adventure highlights</h2>}
                {familyEntries.length === 0 && !review && !hasFamilyUpdate(weeklyUpdate) && <div className="panel blank"><ClipboardList size={28} /><h2>The adventure is just beginning</h2><p>Weekly updates, completed missions and learning reviews will appear here.</p></div>}
                {familyEntries.map(({ entry, mission }, index) => <article className="panel family-entry" key={index}>
                  <div className="mission-main">
                    <span className={`activity-icon ${mood[index % mood.length]}`}>{mission.icon}</span>
                    <div><h3>{mission.title}</h3><p>{entry.participation}</p></div>
                    {entry.completed && <span className="family-star" aria-label="Star earned"><Star size={20} fill="currentColor" /></span>}
                  </div>
                  <dl><dt>Learning outcome</dt><dd>{mission.outcome}</dd>{entry.note && <><dt>Learning note</dt><dd>{entry.note}</dd></>}</dl>
                </article>)}
              </section>
              <section className="panel photo-panel adventure-photo">
                <div className="aside-heading"><span className="tiny-icon pink"><Camera size={18} /></span><h2>Adventure photo</h2></div>
                <PhotoPlaceholder child={child} />
              </section>
            </div>
          </>}
        </div>
        {isOwner && <div hidden id={`portal-${isParent ? "teacher" : "parent"}-panel`} role="tabpanel" aria-labelledby={`portal-${isParent ? "teacher" : "parent"}-tab`} />}
      </main>
    </div>

    {modal && <Dialog key={modal.kind} onClose={() => { setModal(null); setFailure(""); }} title={
      modal.kind === "child" ? (modal.child ? "Edit explorer" : "Add a little explorer") :
        modal.kind === "week" ? "Edit weekly missions" : modal.kind === "plan" ? `Edit ${child.group} topics` : modal.kind === "class" ? "Class checklist" : "Add a learning note"
    }>
      {failure && <div className="banner error" role="alert">{failure}</div>}
      {modal.kind === "child" && <form onSubmit={submitChild}>
        <label>First name or nickname<input name="name" required maxLength={45} autoComplete="off" defaultValue={modal.child?.name} /></label>
        <div className="form-row">
          <label>Nursery group<select name="group" defaultValue={modal.child?.group ?? "Pre-KG"}>{groups.map(group => <option key={group}>{group}</option>)}</select></label>
          <label>Membership avatar<select name="avatar" defaultValue={modal.child?.avatar ?? avatars[0]}>{avatars.map((avatar, index) => <option key={avatar} value={avatar}>{avatar} {["Bear", "Butterfly", "Lion", "Rabbit", "Bee", "Frog", "Rainbow", "Star"][index]}</option>)}</select></label>
        </div>
        <label>Family photo consent<select name="consent" defaultValue={modal.child?.consent ?? "pending"}>{Object.entries(consentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <p className="form-hint">Record consent after checking with the family. The book and card use a placeholder.</p>
        <FormActions disabled={!ready || saving} onCancel={() => setModal(null)} label={saving ? "Saving…" : "Save profile"} />
      </form>}
      {modal.kind === "week" && <form onSubmit={submitWeek}>
        <p className="form-hint">{weekLabel(date)} · The same nine missions apply to all explorers. Missions with any recorded progress are locked for this week.</p>
        <label>Adventure theme<input name="title" required maxLength={80} defaultValue={week.title} /></label>
        {week.missions.map((mission, index) => <fieldset key={index} disabled={lockedMissions.has(index)}>
          <legend>Mission {index + 1}{lockedMissions.has(index) && <span className="mission-locked"><LockKeyhole size={13} /> Progress recorded</span>}</legend>
          <div className="form-row wide-first">
            <label>Activity title<input name={`mission-${index}`} required maxLength={80} defaultValue={mission.title} /></label>
            <label>Icon<select name={`icon-${index}`} defaultValue={mission.icon}>{emojis.map(emoji => <option key={emoji}>{emoji}</option>)}</select></label>
          </div>
          <label>Skill or topic<input name={`category-${index}`} required maxLength={40} defaultValue={mission.category} /></label>
          <label>Learning outcome<textarea name={`outcome-${index}`} required maxLength={200} rows={2} defaultValue={mission.outcome} /></label>
        </fieldset>)}
        <FormActions disabled={!ready || saving} onCancel={() => setModal(null)} label={saving ? "Saving…" : "Save mission sheet"} />
      </form>}
      {modal.kind === "note" && <form onSubmit={submitNote}>
        <p className="form-hint">{week.missions[modal.index].title} · {child.name}</p>
        <label>Participation<select name="participation" defaultValue={entries[modal.index].participation}>{participation.map(label => <option key={label}>{label}</option>)}</select></label>
        <label>Performance note<textarea name="note" rows={4} maxLength={600} placeholder="What did they try, say or do? What helped?" defaultValue={entries[modal.index].note} /></label>
        <p className="form-hint">This note appears in the family view and on its printed page.</p>
        <FormActions disabled={saving || (!demo && !ready)} onCancel={() => setModal(null)} label={saving ? "Saving…" : "Save learning note"} />
      </form>}
      {modal.kind === "plan" && <LearningPlanForm group={child.group} date={date} targets={targets} saving={saving}
        onCancel={() => setModal(null)} onSave={saveLearningPlan} />}
      {modal.kind === "class" && <ClassChecklist explorers={club.children} week={week} records={club.records} saving={saving}
        onAddExplorer={() => openModal({ kind: "child" })} onAward={awardClassStars} />}
    </Dialog>}

    {showStars && <Dialog title="My Star Collection" onClose={() => setShowStars(false)}>
      <div className="star-celebration">
        <span className="avatar" aria-hidden="true">{child.avatar}</span>
        <strong>{child.name}’s stars</strong>
        <p>{earned === 0 ? "Let’s try a mission together!" : earned === 9 ? "You joined all nine missions!" : `${earned} ${earned === 1 ? "star" : "stars"} for joining in!`}</p>
        <StarGrid count={earned} large />
      </div>
      <div className="form-actions"><button className="primary" onClick={() => setShowStars(false)}>Done</button></div>
    </Dialog>}

    {print && <Dialog title={print === "cards" ? "Class card preview" : print === "card" ? "Membership card preview" : print === "mission" ? "Mission sheet preview" : "Adventure Book preview"} onClose={() => setPrint(null)}>
      {print === "cards" && <label className="print-card-group">Cards to print
        <select value={printGroup} onChange={event => setPrintGroup(event.target.value as typeof printGroup)}>
          <option value="all">All explorers</option>
          {groups.filter(group => club.children.some(person => person.group === group)).map(group => <option key={group}>{group}</option>)}
        </select>
      </label>}
      <div className="paper-preview">{printContent}</div>
      {(print === "card" || print === "cards") && <p className="print-card-help">Use 100% print scale for 85.6 × 54 mm cards.</p>}
      <div className="form-actions">
        <button className="secondary" onClick={() => setPrint(null)}>Close</button>
        <button className="primary" onClick={() => window.print()}><Printer size={17} /> Print / Save PDF</button>
      </div>
    </Dialog>}
    <div className="print-area" aria-hidden="true">{printContent}</div>
  </>;
}

function PhotoPlaceholder({ child }: { child: Child }) {
  return <div className="photo-placeholder">
    {child.consent === "granted" ? <Camera size={26} /> : <LockKeyhole size={26} />}
    <strong>{child.consent === "granted" ? "Photo space" : "Photo kept private"}</strong>
    <span>{child.consent === "granted" ? "Consent recorded. Add a printed photo here if the family has agreed." :
      child.consent === "declined" ? "Photo consent declined." : "Family consent is pending."}</span>
  </div>;
}

function PrintHeader({ title, week, child }: { title: string; week: Week; child: Child }) {
  return <header><b>Bubbly Adventure Club</b><h1>{title}</h1><h2>{week.title}</h2><p>{child.name} · {child.group} · {weekLabel(week.date)}{child.id === sample.id && " · Sample"}</p></header>;
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={ref} onCancel={event => { event.preventDefault(); onClose(); }} aria-labelledby="dialog-heading">
    <div className="dialog-heading"><h2 id="dialog-heading">{title}</h2><button className="note-button" aria-label="Close dialog" onClick={onClose}><X size={21} /></button></div>
    {children}
  </dialog>;
}

function FormActions({ onCancel, disabled, label }: { onCancel: () => void; disabled: boolean; label: string }) {
  return <div className="form-actions"><button type="button" className="secondary" onClick={onCancel}>Cancel</button><button type="submit" className="primary" disabled={disabled}>{label}</button></div>;
}
