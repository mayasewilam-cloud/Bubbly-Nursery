import { Camera, Star } from "lucide-react";
import type { Child } from "../lib/club";

export function Membership({ child, demo, printable = false }: { child: Child; demo: boolean; printable?: boolean }) {
  const longName = child.name.length > 34 ? "very-long-name" : child.name.length > 22 ? "long-name" : child.name.length > 12 ? "medium-name" : "";
  const photoSpace = printable && child.consent === "granted";
  return <div className={`membership ${child.group === "Pre-KG" ? "membership-mint" : "membership-lilac"} ${printable ? "print-card" : ""}`}>
    <div className="member-face">
      <img src="/explorer.webp" width="960" height="624" className="member-illustration" alt="" />
      <div className="member-wordmark">
        <b className="member-rainbow" aria-label="Bubbly">{[..."Bubbly"].map((letter, index) => <span key={index} aria-hidden="true">{letter}</span>)}</b>
        <span>Adventure Club</span>
      </div>
      <div className={`member-identity ${longName}`}>
        <strong dir="auto">{child.name}</strong>
        <span>{child.group}</span>
      </div>
      <span className="member-ribbon"><Star aria-hidden="true" /> Little Explorer</span>
      {photoSpace
        ? <div className="member-token photo-space"><Camera aria-hidden="true" /><span>My photo</span></div>
        : <div className="member-token" aria-hidden="true">{child.avatar}</div>}
      {demo && <span className="member-sample">Sample</span>}
    </div>
  </div>;
}

export function MembershipSheets({ explorers }: { explorers: Child[] }) {
  const pageSize = 8;
  const sheets = Array.from({ length: Math.ceil(explorers.length / pageSize) }, (_, index) =>
    explorers.slice(index * pageSize, (index + 1) * pageSize));
  return <div className="membership-sheets">
    {sheets.map((sheet, index) => <div className="membership-sheet" key={index}>
      {sheet.map(child => <Membership key={child.id} child={child} demo={false} printable />)}
    </div>)}
  </div>;
}

export function StarGrid({ count, large = false }: { count: number; large?: boolean }) {
  return <div className={`stars ${large ? "stars-large" : ""}`} role="img" aria-label={`${count} of 9 stars collected`}>
    {Array.from({ length: 9 }, (_, index) => <span key={index} className={index < count ? "earned" : ""}><Star size={25} aria-hidden="true" /></span>)}
  </div>;
}
