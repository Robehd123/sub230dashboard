// AthleteNotes.jsx — running journal with collapsible entries

import React, { useState, useEffect } from "react";

const YELLOW = "#FFFF00";
const BACKEND = "https://sub230-backend.sub230.workers.dev";

function JournalEntry({ entry }) {
  const [open, setOpen] = useState(false);
  const date = entry.recorded_at
    ? new Date(entry.recorded_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    : "";
  const preview = entry.notes.length > 60 ? entry.notes.slice(0, 60).trimEnd() + "…" : entry.notes;

  return (
    <div style={AN.entry} onClick={() => setOpen(o => !o)}>
      <div style={AN.entryHead}>
        <span style={AN.entryDate}>{date}</span>
        <span style={AN.entryChevron}>{open ? "▴" : "▾"}</span>
      </div>
      <p style={open ? AN.entryTextOpen : AN.entryTextPreview}>
        {open ? entry.notes : preview}
      </p>
    </div>
  );
}

export function AthleteNotes({ latestNote }) {
  const [entries, setEntries]     = useState(latestNote ? [latestNote] : []);
  const [loaded, setLoaded]       = useState(false);
  const [adding, setAdding]       = useState(false);
  const [text, setText]           = useState("");
  const [submitting, setSubmitting] = useState(false);

  // load full journal on first open
  useEffect(() => {
    if (!loaded) {
      fetch(`${BACKEND}/api/notes`)
        .then(r => r.json())
        .then(data => { setEntries(Array.isArray(data) ? data : []); setLoaded(true); })
        .catch(() => setLoaded(true));
    }
  }, [loaded]);

  async function save() {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${BACKEND}/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: text.trim() }),
      });
      const updated = await fetch(`${BACKEND}/api/notes`).then(r => r.json());
      setEntries(Array.isArray(updated) ? updated : []);
      setText("");
      setAdding(false);
    } catch {}
    setSubmitting(false);
  }

  const lastDate = entries[0]?.recorded_at
    ? new Date(entries[0].recorded_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : null;

  return (
    <div style={AN.wrap}>
      <div style={AN.header}>
        <div>
          <span style={AN.label}>RUNNING JOURNAL</span>
          {lastDate && <span style={AN.lastUpdated}> · {lastDate}</span>}
        </div>
        <button
          style={AN.addBtn}
          onClick={() => setAdding(o => !o)}
        >
          {adding ? "Cancel" : "+ New entry"}
        </button>
      </div>

      {adding && (
        <div style={AN.inputBlock}>
          <textarea
            style={AN.textarea}
            placeholder="How are you feeling? Any injuries, fatigue, life stress, or context the coach should know about?"
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            autoFocus
          />
          <button
            style={{ ...AN.saveBtn, opacity: text.trim() && !submitting ? 1 : 0.4 }}
            onClick={save}
            disabled={!text.trim() || submitting}
          >
            {submitting ? "Saving…" : "Save entry"}
          </button>
        </div>
      )}

      {entries.length === 0 && !adding && (
        <p style={AN.placeholder}>
          Log injuries, fatigue, or any context that should inform the plan. The three most recent entries feed directly into plan generation.
        </p>
      )}

      {entries.map((e, i) => (
        <JournalEntry key={e.id || i} entry={e} />
      ))}
    </div>
  );
}

const AN = {
  wrap: {
    background: "#0D0D0B",
    border: "1px solid #1A1A18",
    borderRadius: 16,
    padding: "14px 18px",
    marginBottom: 14,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  label: {
    fontSize: 10,
    color: "#6A6A63",
    letterSpacing: 1.4,
    fontWeight: 500,
  },
  lastUpdated: {
    fontSize: 10,
    color: "#3A3A38",
  },
  addBtn: {
    background: "none",
    border: "1px solid #2A2A28",
    borderRadius: 8,
    color: YELLOW,
    fontSize: 11,
    fontWeight: 600,
    padding: "4px 10px",
    cursor: "pointer",
    letterSpacing: 0.2,
  },
  inputBlock: {
    marginBottom: 12,
  },
  textarea: {
    width: "100%",
    background: "#111110",
    border: "1px solid #2A2A28",
    borderRadius: 10,
    color: "#C2C2BA",
    fontSize: 13,
    lineHeight: 1.5,
    padding: "10px 12px",
    resize: "none",
    outline: "none",
    fontFamily: "system-ui, -apple-system, sans-serif",
    marginBottom: 8,
    boxSizing: "border-box",
  },
  saveBtn: {
    width: "100%",
    background: YELLOW,
    color: "#070707",
    border: "none",
    borderRadius: 10,
    padding: "10px 0",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  placeholder: {
    fontSize: 12,
    color: "#3A3A38",
    lineHeight: 1.5,
    margin: 0,
  },
  entry: {
    borderTop: "1px solid #161614",
    paddingTop: 10,
    paddingBottom: 6,
    cursor: "pointer",
  },
  entryHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  entryDate: {
    fontSize: 11,
    color: "#5A5A55",
    fontWeight: 500,
  },
  entryChevron: {
    fontSize: 10,
    color: "#3A3A38",
  },
  entryTextPreview: {
    fontSize: 13,
    color: "#6A6A63",
    margin: 0,
    lineHeight: 1.45,
  },
  entryTextOpen: {
    fontSize: 13,
    color: "#C2C2BA",
    margin: 0,
    lineHeight: 1.55,
  },
};