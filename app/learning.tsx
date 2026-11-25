"use client";

import { useState, type FormEvent } from "react";
import { BookOpen, CalendarDays, ClipboardList, Pencil, Plus, Sprout, X } from "lucide-react";
import {
  hasReviewEvidence, maxLearningTargets, reviewStatusLabels, reviewStatuses, weekLabel, type Child, type LearningTarget, type Review,
} from "../lib/club";

export function LearningReviewForm({ child, targets, review, draft: savedDraft, saving, canSave, canEditPlan, onChange, onEditPlan, onSave }: {
  child: Child;
  targets: LearningTarget[];
  review?: Review;
  draft?: Review;
  saving: boolean;
  canSave: boolean;
  canEditPlan: boolean;
  onChange: (value: Review) => void;
  onEditPlan: () => void;
  onSave: (review: Review) => Promise<boolean>;
}) {
  const baseline: Review = review ?? {
    targets: targets.map(target => ({ ...target, status: "unassessed", response: "" })),
    observation: "",
    nextStep: "",
  };
  const draft = savedDraft ?? baseline;
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const completed = draft.targets.filter(hasReviewEvidence).length;

  function updateTarget(index: number, update: Partial<Review["targets"][number]>) {
    onChange({
      ...draft,
      targets: draft.targets.map((target, position) => position === index ? { ...target, ...update } : target),
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dirty && !saving && canSave) void onSave(draft);
  }

  return <form className="review-form" onSubmit={submit}>
    <section className="panel review-intro">
      <div className="avatar big" aria-hidden="true">{child.avatar}</div>
      <div>
        <h2><bdi>{child.name}</bdi>’s learning review</h2>
        <p>{child.group} · {completed} of {draft.targets.length} topics reviewed</p>
      </div>
      <button className="secondary" type="button" onClick={onEditPlan} disabled={!canEditPlan || (dirty && !review)}><Pencil size={16} /> Edit {child.group} topics</button>
    </section>
    <p className="review-instruction">Use a short play prompt and record what the child did or said. A look, a point or an action can be a response.</p>
    <div className="review-grid">
      {draft.targets.map((target, index) => <section className="panel review-target" key={index} aria-label={target.topic}>
        <h3>{target.topic}</h3>
        <p>{target.prompt}</p>
        <label>How did they respond?
          <select disabled={saving} value={target.status} onChange={event => updateTarget(index, { status: event.target.value as typeof target.status })}>
            {reviewStatuses.map(value => <option key={value} value={value}>{reviewStatusLabels[value]}</option>)}
          </select>
        </label>
        <label>What did you see or hear?
          <textarea dir="auto" disabled={saving} value={target.response} onChange={event => updateTarget(index, { response: event.target.value })} maxLength={400} rows={2} />
        </label>
      </section>)}
    </div>
    <section className="panel review-target review-conclusion">
      <h3>Family summary</h3>
      <p>These notes appear in the child’s Adventure Book.</p>
      <label>Teacher’s observation
        <textarea dir="auto" disabled={saving} value={draft.observation} onChange={event => onChange({ ...draft, observation: event.target.value })} maxLength={600} rows={3} />
      </label>
      <label>Next learning step
        <textarea dir="auto" disabled={saving} value={draft.nextStep} onChange={event => onChange({ ...draft, nextStep: event.target.value })} maxLength={400} rows={2} />
      </label>
      <div className="review-save">
        {dirty ? <span className="review-status">Unsaved changes</span> : review && <span className="review-status independent">Review saved</span>}
        <button className="primary" disabled={saving || !canSave || !dirty} type="submit">{saving ? "Saving…" : "Save learning review"}</button>
      </div>
    </section>
  </form>;
}

export function LearningPlanForm({ group, date, targets, saving, onCancel, onSave }: {
  group: Child["group"];
  date: string;
  targets: LearningTarget[];
  saving: boolean;
  onCancel: () => void;
  onSave: (targets: LearningTarget[]) => Promise<boolean>;
}) {
  const [topics, setTopics] = useState(targets.map((target, index) => ({ ...target, fieldId: index })));
  const [nextId, setNextId] = useState(targets.length);
  function change(fieldId: number, field: keyof LearningTarget, value: string) {
    setTopics(previous => previous.map(topic => topic.fieldId === fieldId ? { ...topic, [field]: value } : topic));
  }
  return <form onSubmit={event => {
    event.preventDefault();
    void onSave(topics.map(({ topic, prompt }) => ({ topic, prompt })));
  }}>
    <p className="form-hint">{group} · {weekLabel(date)}. These topics are used when starting reviews for this group. Saved reviews keep their original prompts.</p>
    {topics.map(({ fieldId, topic, prompt }) => <fieldset key={fieldId}>
      <div className="plan-field-heading">
        <label>Topic<input required value={topic} maxLength={80} onChange={event => change(fieldId, "topic", event.target.value)} /></label>
        {topics.length > 1 && <button type="button" className="note-button" aria-label={topic ? `Remove ${topic}` : "Remove new topic"} onClick={() => setTopics(previous => previous.filter(item => item.fieldId !== fieldId))}><X size={17} /></button>}
      </div>
      <label>Play prompt<textarea required value={prompt} maxLength={240} rows={2} onChange={event => change(fieldId, "prompt", event.target.value)} /></label>
    </fieldset>)}
    {topics.length < maxLearningTargets && <button type="button" className="secondary" onClick={() => {
      setTopics([...topics, { fieldId: nextId, topic: "", prompt: "" }]);
      setNextId(nextId + 1);
    }}><Plus size={16} /> Add topic</button>}
    <div className="form-actions">
      <button className="secondary" type="button" onClick={onCancel}>Cancel</button>
      <button className="primary" disabled={saving} type="submit">{saving ? "Saving…" : "Save group topics"}</button>
    </div>
  </form>;
}

export function PortfolioReview({ review }: { review: Review }) {
  const recorded = review.targets.filter(hasReviewEvidence);
  return <section className="panel portfolio-review" aria-label="Weekly learning review">
    <div className="aside-heading"><span className="tiny-icon lilac"><ClipboardList size={18} /></span><h2>Weekly Learning Review</h2></div>
    {recorded.length > 0 && <ul className="review-results">{recorded.map(({ topic, status, response }, index) => <li key={index}>
      <div><strong dir="auto">{topic}</strong>{response && <p dir="auto">{response}</p>}</div>
      {status !== "unassessed" && <span className={`review-status ${status}`}>{reviewStatusLabels[status]}</span>}
    </li>)}</ul>}
    {review.observation && <div className="review-summary"><h3>Teacher’s observation</h3><p dir="auto">{review.observation}</p></div>}
    {review.nextStep && <div className="review-summary next-step"><h3><Sprout size={17} /> Next learning step</h3><p dir="auto">{review.nextStep}</p></div>}
  </section>;
}

export function PortfolioHistory({ dates, selectedDate, onSelect }: {
  dates: string[];
  selectedDate: string;
  onSelect: (value: string) => void;
}) {
  return <section className="panel photo-panel book-history">
    <div className="aside-heading"><span className="tiny-icon mint"><BookOpen size={18} /></span><h2>Adventure Book history</h2></div>
    <label htmlFor="portfolio-week"><CalendarDays size={17} /> Choose a week</label>
    <select id="portfolio-week" value={selectedDate} onChange={event => onSelect(event.target.value)}>
      {dates.map(date => <option key={date} value={date}>{weekLabel(date)}</option>)}
    </select>
  </section>;
}
