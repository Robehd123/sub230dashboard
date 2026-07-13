// ActivityFeedbackCard.jsx — recent run card with expandable feedback dropdown

import React, { useState } from "react";

const YELLOW = "#FFFF00";
import { BACKEND } from "./config.js";

const RATINGS = [
  { v: 1, label: "Terrible", color: "#F87171" },
  { v: 2, label: "Hard",     color: "#EC9649" },
  { v: 3, label: "OK",       color: "#FFFF00" },
  { v: 4, label: "Good",     color: "#86EFAC" },
  { v: 5, label: "Great",    color: "#19E785" },
];

export function ActivityFeedbackCard({ activity, typeColour, fmtDist, fmtTime, fmtPace, recentFeedback }) {
const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const existing = recentFeedback?.find(f =>
    f.activity_date === activity.start_date.split("T")[0] &&
    f.activity_name === activity.name
  );

const hasFeedback = !!existing || justSubmitted;

  async function deleteFeedback() {
    if (!existing?.id) return;
    try {
      await fetch(`${BACKEND}/api/feedback/${existing.id}`, { method: "DELETE" });
      setDeleted(true);
      setJustSubmitted(false);
    } catch {}
  }

  async function submit() {
    if (!rating && !notes.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${BACKEND}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strava_id: activity.strava_id,
          activity_name: activity.name,
          activity_date: activity.start_date.split("T")[0],
          rating,
          notes: notes.trim(),
        }),
      });
      setJustSubmitted(true);
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div style={AC.card}>
      <div style={AC.head} onClick={() => setOpen(o => !o)}>
        <span style={{ ...AC.typeDot, background: typeColour }} />
        <span style={AC.name}>{activity.name}</span>
        <span style={AC.date}>{new Date(activity.start_date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
      </div>
      <div style={AC.stats}>
        <span style={AC.stat}>{fmtDist(activity.distance_m)}</span>
        <span style={AC.sep}>·</span>
        <span style={AC.stat}>{fmtTime(activity.moving_time_s)}</span>
        <span style={AC.sep}>·</span>
        <span style={AC.stat}>{fmtPace(activity.distance_m, activity.moving_time_s)}</span>
        {activity.average_hr && <><span style={AC.sep}>·</span><span style={AC.stat}>{Math.round(activity.average_hr)} bpm</span></>}
      </div>

      <button style={AC.toggleBtn} onClick={() => setOpen(o => !o)}>
        <span style={{ color: hasFeedback ? "#19E785" : "#6A6A63" }}>
          {hasFeedback ? "Feedback added" : "How did this go?"}
        </span>
        <span style={{ ...AC.chevron, transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>⌄</span>
      </button>

      {open && (
        <div style={AC.expanded}>
          {hasFeedback && !deleted ? (
            <div style={AC.savedBlock}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  {existing?.rating && (
                    <span style={{ ...AC.savedRating, color: RATINGS.find(r => r.v === existing.rating)?.color || "#19E785" }}>
                      {RATINGS.find(r => r.v === existing.rating)?.label}
                    </span>
                  )}
                  {existing?.notes && <p style={AC.savedNotes}>{existing.notes}</p>}
                  {!existing && <span style={AC.savedNotes}>Saved.</span>}
                </div>
                {existing?.id && (
                  <button style={AC.deleteBtn} onClick={deleteFeedback}>Delete</button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div style={AC.ratingRow}>
                {RATINGS.map(r => (
                  <button
                    key={r.v}
                    style={{
                      ...AC.ratingBtn,
                      background: rating === r.v ? `${r.color}22` : "transparent",
                      border: `1px solid ${rating === r.v ? r.color : "#2A2A28"}`,
                      color: rating === r.v ? r.color : "#5A5A55",
                    }}
                    onClick={() => setRating(r.v)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <textarea
                style={AC.textarea}
                placeholder="How did it actually go? Any niggles or changes?"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
              />
              <button
                style={{ ...AC.submitBtn, opacity: (rating || notes.trim()) && !submitting ? 1 : 0.4 }}
                onClick={submit}
                disabled={(!rating && !notes.trim()) || submitting}
              >
                {submitting ? "Saving..." : "Save feedback"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const AC = {
  card: {
    background: "#0C0C0B",
    border: "1px solid #161614",
    borderRadius: 16,
    padding: "14px 16px",
    marginBottom: 10,
  },
  head: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" },
  typeDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  name: { fontSize: 14, fontWeight: 600, color: "#fff", flex: 1 },
  date: { fontSize: 11, color: "#6A6A63" },
  stats: { display: "flex", gap: 6, marginTop: 6, marginLeft: 16 },
  stat: { fontSize: 12, color: "#8E8E86" },
  sep: { fontSize: 12, color: "#3A3A38" },
  toggleBtn: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    width: "100%", background: "none", border: "none",
    marginTop: 10, paddingTop: 10, borderTop: "1px solid #161614",
    fontSize: 12, fontWeight: 500, cursor: "pointer",
  },
  chevron: { fontSize: 14, color: "#5A5A55", transition: "transform 0.2s" },
  expanded: { marginTop: 10 },
  savedBlock: {},
  savedRating: { fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 },
  savedNotes: { fontSize: 12, color: "#A8A8A0", lineHeight: 1.5, margin: 0 },
  ratingRow: { display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" },
  ratingBtn: {
    flex: 1, minWidth: 56, padding: "5px 3px", borderRadius: 7,
    fontSize: 10, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
  },
  textarea: {
    width: "100%", background: "#111110", border: "1px solid #2A2A28",
    borderRadius: 9, color: "#C2C2BA", fontSize: 12, lineHeight: 1.5,
    padding: "8px 10px", resize: "none", outline: "none",
    fontFamily: "system-ui, -apple-system, sans-serif", marginBottom: 8, boxSizing: "border-box",
  },
  submitBtn: {
    width: "100%", background: YELLOW, color: "#070707", border: "none",
    borderRadius: 9, padding: "8px 0", fontSize: 12, fontWeight: 700, cursor: "pointer",
 },
  deleteBtn: {
    background: "none",
    border: "1px solid #2A2A28",
    borderRadius: 6,
    color: "#E86A5E",
    fontSize: 10,
    fontFamily: "system-ui",
    padding: "2px 8px",
    cursor: "pointer",
    flexShrink: 0,
    marginLeft: 8,
  },
};