"use client";

import type { KeyboardEvent } from "react";
import { Check, GraduationCap, Heart, LockKeyhole, MessageCircle, Sprout } from "lucide-react";
import { weekLabel, type Child, type WeeklyUpdate } from "../lib/club";

export type Portal = "teacher" | "parent";

const portals = [
  { id: "teacher", title: "Teacher", icon: GraduationCap },
  { id: "parent", title: "Parent", icon: Heart },
] as const;

export function PortalTabs({ current, onChange }: { current: Portal; onChange: (value: Portal) => void }) {
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    let next: Portal;
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowRight":
        next = current === "teacher" ? "parent" : "teacher";
        break;
      case "Home":
        next = "teacher";
        break;
      case "End":
        next = "parent";
        break;
      default:
        return;
    }
    event.preventDefault();
    onChange(next);
    event.currentTarget.querySelector<HTMLButtonElement>(`#portal-${next}-tab`)?.focus();
  }

  return <div className="portal-tabs" role="tablist" aria-label="Club workspace" onKeyDown={keyboard}>
    {portals.map(({ id, title, icon: Icon }) => <button
      key={id}
      type="button"
      id={`portal-${id}-tab`}
      role="tab"
      aria-selected={current === id}
      aria-controls={`portal-${id}-panel`}
      tabIndex={current === id ? 0 : -1}
      onClick={() => onChange(id)}
    ><Icon size={18} aria-hidden="true" />{title}</button>)}
  </div>;
}

export function WeeklyUpdateForm({ child, date, value, saved, dirty, demo, saving, canSave, onChange, onSave, onPreview }: {
  child: Child;
  date: string;
  value: WeeklyUpdate;
  saved: boolean;
  dirty: boolean;
  demo: boolean;
  saving: boolean;
  canSave: boolean;
  onChange: (value: WeeklyUpdate) => void;
  onSave: () => Promise<void>;
  onPreview: () => void;
}) {
  return <form className="weekly-update-form" onSubmit={event => { event.preventDefault(); void onSave(); }}>
    <section className="panel update-context">
      <span className="avatar big" aria-hidden="true">{child.avatar}</span>
      <div><h2>{child.name}’s weekly update</h2><p>{child.group} · {weekLabel(date)}{demo && " · Sample"}</p></div>
      <button className="secondary" type="button" onClick={onPreview}><Heart size={17} aria-hidden="true" /> Preview Parent tab</button>
    </section>
    <div className="weekly-update-grid">
      <section className="panel update-fields">
        <div className="aside-heading"><span className="tiny-icon mint"><MessageCircle size={18} aria-hidden="true" /></span><h2>For the family</h2></div>
        <label>Family message
        <textarea dir="auto" value={value.familyNote} onChange={event => onChange({ ...value, familyNote: event.target.value })} maxLength={800} rows={4} disabled={saving} placeholder="What did this child enjoy or try this week?" />
        </label>
        <label><span className="field-label">Try at home <span className="field-optional">Optional</span></span>
        <textarea dir="auto" value={value.homeIdea} onChange={event => onChange({ ...value, homeIdea: event.target.value })} maxLength={400} rows={3} disabled={saving} placeholder="A song, game or little idea to try together." />
        </label>
        <p className="form-hint">Saved messages and home ideas appear in the Parent tab and its printout.</p>
      </section>
      <section className="panel update-fields teacher-note-panel">
        <div className="aside-heading"><span className="tiny-icon lilac"><LockKeyhole size={18} aria-hidden="true" /></span><h2>For the teacher</h2></div>
        <label><span className="field-label">Private teacher note <span className="field-optional">Optional</span></span>
        <textarea dir="auto" value={value.teacherNote} onChange={event => onChange({ ...value, teacherNote: event.target.value })} maxLength={800} rows={4} disabled={saving} placeholder="What would you like to remember for the next session?" />
        </label>
        <p className="form-hint">This note appears only in the Teacher tab.</p>
      </section>
    </div>
    <div className="update-save">
      {dirty ? <span className="review-status">Unsaved changes</span> : saved && <span className="review-status independent"><Check size={14} aria-hidden="true" /> Saved</span>}
      <button className="primary" type="submit" disabled={!canSave || saving || !dirty}>{saving ? "Saving…" : "Save weekly update"}</button>
    </div>
    {demo && <p className="form-hint">Changes to the sample profile are visible until you reload.</p>}
  </form>;
}

export function FamilyUpdate({ note, idea }: { note: string; idea: string }) {
  return <section className="panel family-update" aria-label="A note for your family">
    <div className="aside-heading"><span className="tiny-icon mint"><MessageCircle size={18} aria-hidden="true" /></span><h2>A note for your family</h2></div>
    {note && <p dir="auto">{note}</p>}
    {idea && <div className="review-summary next-step"><h3><Sprout size={17} aria-hidden="true" /> Try at home</h3><p dir="auto">{idea}</p></div>}
  </section>;
}
