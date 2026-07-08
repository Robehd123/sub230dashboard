// BodyCard.jsx — body composition from InBody via Apple Health

import React from "react";

const GREEN  = "var(--pos)";
const ORANGE = "var(--warn)";

export function BodyCard({ body }) {
  if (!body?.weight_kg && !body?.body_fat_pct) {
    return (
      <div style={BC.wrap}>
        <div style={BC.label}>BODY COMPOSITION</div>
        <div style={BC.pending}>
          No InBody data yet. After your next scan, open InBody, sync to Apple Health, then run a manual export in Health Auto Export.
        </div>
      </div>
    );
  }

  const date = body.date
    ? new Date(body.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;

  // body fat colour and context: green below 12%, yellow 12-16%, orange above
  const fatColor = !body.body_fat_pct ? "#5A5A55"
    : body.body_fat_pct < 12 ? GREEN
    : body.body_fat_pct < 16 ? YELLOW
    : ORANGE;

  const fatContext = !body.body_fat_pct ? ""
    : body.body_fat_pct < 10 ? "Very lean for endurance"
    : body.body_fat_pct < 14 ? "Strong endurance range"
    : body.body_fat_pct < 18 ? "Healthy range"
    : "Room to lean out for racing weight";

  return (
    <div style={BC.wrap}>
      <div style={BC.header}>
        <span style={BC.label}>BODY COMPOSITION</span>
        {date && <span style={BC.date}>{date}</span>}
      </div>

      <div style={BC.grid}>
        {body.weight_kg && (
          <div style={BC.stat}>
            <div style={BC.statVal}>{body.weight_kg.toFixed(1)}<span style={BC.statUnit}>kg</span></div>
            <div style={BC.statLabel}>Weight</div>
          </div>
        )}
        {body.body_fat_pct && (
          <div style={BC.stat}>
            <div style={{ ...BC.statVal, color: fatColor }}>{body.body_fat_pct.toFixed(1)}<span style={{ ...BC.statUnit, color: fatColor }}>%</span></div>
            <div style={BC.statLabel}>Body fat</div>
            {fatContext && <div style={{ ...BC.statContext, color: fatColor }}>{fatContext}</div>}
          </div>
        )}
        {body.lean_mass_kg && (
          <div style={BC.stat}>
            <div style={BC.statVal}>{body.lean_mass_kg.toFixed(1)}<span style={BC.statUnit}>kg</span></div>
            <div style={BC.statLabel}>Lean mass</div>
          </div>
        )}
      </div>
    </div>
  );
}

const BC = {
wrap: {
    background: "var(--ground-1)",
    border: "1px solid var(--line)",
    borderRadius: "var(--r)",
    padding: "14px 18px",
    marginBottom: 10,
    marginTop: 10,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
label: {
    fontFamily: "var(--mono)",
    fontSize: 9.5,
    color: "var(--ink-low)",
    letterSpacing: ".16em",
    textTransform: "uppercase",
  },
  date: {
    fontFamily: "var(--mono)",
    fontSize: 10,
    color: "var(--ink-low)",
  },
  grid: {
    display: "flex",
    gap: 24,
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  statVal: {
    fontSize: 24,
    fontWeight: 800,
    color: "#fff",
    letterSpacing: -0.5,
    lineHeight: 1,
  },
  statUnit: {
    fontSize: 13,
    fontWeight: 500,
    color: "#6A6A63",
    marginLeft: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#6A6A63",
    marginTop: 2,
  },
  statContext: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: 500,
  },
pending: {
    fontFamily: "var(--mono)",
    fontSize: 11,
    color: "var(--ink-low)",
    lineHeight: 1.5,
  },
};