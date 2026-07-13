import React, { useState, useEffect } from "react";
import { BACKEND, JOURNAL_PREVIEW_LEN } from "./config.js";

function JournalEntry({ entry, onDelete }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const date = entry.recorded_at
    ? new Date(entry.recorded_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    : "";
  const preview = entry.notes.length > JOURNAL_PREVIEW_LEN
    ? entry.notes.slice(0, JOURNAL_PREVIEW_LEN).trimEnd() + "…"
    : entry.notes;

  return (
    <div style={AN.entry}>
      <div style={AN.entryHead} onClick={() => setOpen(o => !o)}>
        <span style={AN.entryDate}>{date}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {confirming ? (
            <>
              <button style={AN.confirmBtn} onClick={e => { e.stopPropagation(); onDelete(entry.id); setConfirming(false); }}>
                Confirm
              </button>
              <button style={AN.cancelBtn} onClick={e => { e.stopPropagation(); setConfirming(false); }}>
                Cancel
              </button>
            </>
          ) : (
            <button style={AN.deleteBtn} onClick={e => { e.stopPropagation(); setConfirming(true); }}>
              Delete
            </button>
          )}
          <span style={AN.entryChevron}>{open ? "▴" : "▾"}</span>
        </div>
      </div>
      <p style={open ? AN.entryTextOpen : AN.entryTextPreview}>
        {open ? entry.notes : preview}
      </p>
    </div>
  );
}

export function AthleteNotes({ latestNote }) {
  const [entries, setEntries]       = useState(latestNote ? [latestNote] : []);
  const [loaded, setLoaded]         = useState(false);
  const [adding, setAdding]         = useState(false);
  const [text, setText]             = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loaded) {
      fetch(`${BACKEND}/api/notes`, { headers: { "X-Dashboard-Token": window.__dashToken || "" } })
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
        headers: { "Content-Type": "application/json", "X-Dashboard-Token": window.__dashToken || "" },
        body: JSON.stringify({ notes: text.trim() }),
      });
      const updated = await fetch(`${BACKEND}/api/notes`).then(r => r.json());
      setEntries(Array.isArray(updated) ? updated : []);
      setText("");
      setAdding(false);
    } catch {}
    setSubmitting(false);
  }

  async function deleteEntry(id) {
    try {
      await fetch(`${BACKEND}/api/notes/${id}`, { method: "DELETE", headers: { "X-Dashboard-Token": window.__dashToken || "" } });
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch {}
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
        <button style={AN.addBtn} onClick={() => setAdding(o => !o)}>
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
        <JournalEntry key={e.id || i} entry={e} onDelete={deleteEntry} />
      ))}
    </div>
  );
}

const AN = {
  wrap: {
    background: "var(--ground-1)",
    border: "1px solid var(--line)",
    borderRadius: "var(--r)",
    padding: "14px 18px",
    marginBottom: 10,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  label: {
    fontFamily: "var(--mono)",
    fontSize: 10,
    color: "var(--ink-low)",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
  },
  lastUpdated: {
    fontFamily: "var(--mono)",
    fontSize: 10,
    color: "var(--ink-low)",
  },
  addBtn: {
    background: "none",
    border: "1px solid var(--line)",
    borderRadius: 8,
    color: "var(--accent)",
    fontFamily: "var(--mono)",
    fontSize: 11,
    fontWeight: 600,
    padding: "4px 10px",
    cursor: "pointer",
    letterSpacing: "0.1em",
  },
  inputBlock: { marginBottom: 12 },
  textarea: {
    width: "100%",
    background: "var(--ground-2)",
    border: "1px solid var(--line)",
    borderRadius: "var(--r-s)",
    color: "var(--ink-hi)",
    fontSize: 13,
    lineHeight: 1.5,
    padding: "10px 12px",
    resize: "none",
    outline: "none",
    fontFamily: "var(--body)",
    marginBottom: 8,
    boxSizing: "border-box",
  },
  saveBtn: {
    width: "100%",
    background: "var(--accent)",
    color: "var(--ground-0)",
    border: "none",
    borderRadius: "var(--r-s)",
    padding: "10px 0",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  placeholder: {
    fontFamily: "var(--mono)",
    fontSize: 11,
    color: "var(--ink-low)",
    lineHeight: 1.55,
    margin: 0,
  },
  entry: {
    borderTop: "1px solid var(--line)",
    paddingTop: 10,
    paddingBottom: 6,
  },
  entryHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    cursor: "pointer",
  },
  entryDate: {
    fontFamily: "var(--mono)",
    fontSize: 11,
    color: "var(--ink-low)",
    fontWeight: 500,
  },
  entryChevron: {
    fontSize: 10,
    color: "var(--ink-low)",
  },
  deleteBtn: {
    background: "none",
    border: "1px solid var(--line)",
    borderRadius: 6,
    color: "var(--alert)",
    fontFamily: "var(--mono)",
    fontSize: 10,
    padding: "2px 8px",
    cursor: "pointer",
    letterSpacing: "0.08em",
  },
  confirmBtn: {
    background: "var(--alert)",
    border: "none",
    borderRadius: 6,
    color: "var(--ink-hi)",
    fontFamily: "var(--mono)",
    fontSize: 10,
    padding: "2px 8px",
    cursor: "pointer",
  },
  cancelBtn: {
    background: "none",
    border: "1px solid var(--line)",
    borderRadius: 6,
    color: "var(--ink-low)",
    fontFamily: "var(--mono)",
    fontSize: 10,
    padding: "2px 8px",
    cursor: "pointer",
  },
  entryTextPreview: {
    fontSize: 13,
    color: "var(--ink-low)",
    margin: 0,
    lineHeight: 1.45,
  },
  entryTextOpen: {
    fontSize: 13,
    color: "var(--ink-mid)",
    margin: 0,
    lineHeight: 1.55,
  },
};