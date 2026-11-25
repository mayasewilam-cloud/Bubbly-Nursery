"use client";

import { useState, type FormEvent } from "react";
import { Check, Star, Users } from "lucide-react";
import { groups, missionKey, weekLabel, type Child, type Club, type Week } from "../lib/club";

export default function ClassChecklist({ explorers, week, records, saving, onAddExplorer, onAward }: {
  explorers: Child[];
  week: Week;
  records: Club["records"];
  saving: boolean;
  onAddExplorer: () => void;
  onAward: (mission: number, explorerIds: string[]) => Promise<boolean>;
}) {
  const [mission, setMission] = useState(0);
  const [group, setGroup] = useState<Child["group"] | "all">("all");
  const [selection, setSelection] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const shown = explorers
    .filter(explorer => group === "all" || explorer.group === group)
    .sort((first, second) => first.name.localeCompare(second.name));
  const canMark = shown.filter(explorer => !records[missionKey(explorer.id, week.date, mission)]?.completed);
  const selected = canMark.filter(explorer => selection.includes(explorer.id));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected.length === 0 || saving) return;
    const ids = selected.map(explorer => explorer.id);
    if (await onAward(mission, ids)) {
      setSelection([]);
      setStatus(`${ids.length} ${ids.length === 1 ? "star awarded" : "stars awarded"}!`);
    }
  }

  if (explorers.length === 0) {
    return <div className="class-empty">
      <span className="tiny-icon mint"><Users size={21} aria-hidden="true" /></span>
      <p>Add an explorer to start awarding class stars.</p>
      <button className="primary" onClick={onAddExplorer}>Add explorer</button>
    </div>;
  }

  return <form className="class-checklist" onSubmit={submit}>
    <p className="form-hint">{weekLabel(week.date)} · Pick a mission, then tick the children who joined in.</p>
    <div className="class-filters">
      <label>Mission
        <select value={mission} disabled={saving} onChange={event => {
          setMission(Number(event.target.value));
          setSelection([]);
          setStatus("");
        }}>
          {week.missions.map((item, index) => <option key={index} value={index}>{item.title}</option>)}
        </select>
      </label>
      <label>Group
        <select value={group} disabled={saving} onChange={event => {
          setGroup(event.target.value as typeof group);
          setSelection([]);
          setStatus("");
        }}>
          <option value="all">All explorers</option>
          {groups.filter(item => explorers.some(explorer => explorer.group === item)).map(item => <option key={item}>{item}</option>)}
        </select>
      </label>
    </div>
    <div className="class-list-actions">
      <strong>{shown.length} {shown.length === 1 ? "explorer" : "explorers"}</strong>
      {canMark.length > 0 && <button type="button" className="text-button" disabled={saving}
        onClick={() => setSelection(selected.length === canMark.length ? [] : canMark.map(explorer => explorer.id))}>
        {selected.length === canMark.length ? "Clear selection" : "Select all awaiting a star"}
      </button>}
    </div>
    <div className="class-roster" aria-label="Explorers">
      {shown.map(explorer => {
        const completed = records[missionKey(explorer.id, week.date, mission)]?.completed ?? false;
        return <label key={explorer.id} className={`class-child ${completed ? "has-star" : ""}`}>
          <input type="checkbox" disabled={completed || saving} checked={completed || selection.includes(explorer.id)}
            onChange={event => {
              const checked = event.target.checked;
              setStatus("");
              setSelection(previous => checked ? [...previous, explorer.id] : previous.filter(id => id !== explorer.id));
            }} />
          <span className="class-avatar" aria-hidden="true">{explorer.avatar}</span>
          <span className="class-child-name"><strong>{explorer.name}</strong><small>{explorer.group}</small></span>
          {completed && <span className="class-star-label"><Check size={15} aria-hidden="true" /> Star earned</span>}
        </label>;
      })}
    </div>
    <div className="class-footer">
      <p role="status">{status || `${selected.length} selected`}</p>
      <button className="primary" disabled={saving || selected.length === 0} type="submit">
        <Star size={17} aria-hidden="true" /> {saving ? "Saving…" : selected.length === 1 ? "Award star" : "Award stars"}
      </button>
    </div>
  </form>;
}
