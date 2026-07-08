// HealthCards.jsx — three mini-cards for resting HR, sleep, and steps
// Garmin "At a Glance" style with arc gauges and status-reactive glow

import React from "react";

const GLOW = {
  good:    "rgba(25, 231, 133, 0.35)",   // green tier
  neutral: "rgba(255, 255, 0, 0.20)",    // yellow
  off:     "rgba(236, 150, 73, 0.35)",   // orange tier
  bad:     "rgba(236, 73, 73, 0.35)",    // red
};

function statusGlow(status) {
  return GLOW[status] || GLOW.neutral;
}

// SVG arc gauge
// pct: 0-1, colour: stroke colour
function ArcGauge({ pct, colour, size = 80, label }) {
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const strokeW = size * 0.09;
  // arc from -210deg to +30deg (240deg sweep), open at bottom-left
  const startAngle = -210 * (Math.PI / 180);
  const sweep = 240 * (Math.PI / 180);
  const endAngle = startAngle + sweep * Math.min(Math.max(pct, 0), 1);

  function arcPath(from, to) {
    const x1 = cx + r * Math.cos(from);
    const y1 = cy + r * Math.sin(from);
    const x2 = cx + r * Math.cos(to);
    const y2 = cy + r * Math.sin(to);
    const large = (to - from) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      {/* track */}
      <path d={arcPath(startAngle, startAngle + sweep)} fill="none" stroke="#1E1E1C" strokeWidth={strokeW} strokeLinecap="round" />
      {/* fill */}
      {pct > 0 && (
        <path d={arcPath(startAngle, endAngle)} fill="none" stroke={colour} strokeWidth={strokeW} strokeLinecap="round" />
      )}
      {/* centre label */}
      {label && (
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={size * 0.22} fontWeight="800" fill="#fff" fontFamily="system-ui">{label}</text>
      )}
    </svg>
  );
}

function MiniCard({ title, icon, gauge, bigNum, bigUnit, sub, status, pending }) {
  const glow = statusGlow(status);
  return (
    <div style={HC.card}>
      <div style={HC.cardTop}>
        <span style={HC.icon}>{icon}</span>
        <span style={HC.cardTitle}>{title}</span>
      </div>
      {pending ? (
        <div style={HC.pending}>Pending health feed</div>
      ) : (
        <>
          <div style={HC.gaugeWrap}>
            <ArcGauge {...gauge} />
          </div>
          <div style={HC.bigRow}>
            <span style={HC.bigNum}>{bigNum}</span>
            {bigUnit && <span style={HC.bigUnit}>{bigUnit}</span>}
          </div>
          {sub && <div style={HC.sub}>{sub}</div>}
        </>
      )}
    </div>
  );
}

export function HealthCards({ metrics, hrBaseline, body }) {
  const pending = !metrics || (!metrics.resting_hr && !metrics.steps);

  // resting HR
  const rhr = metrics?.resting_hr;
  const rhrDelta = (rhr && hrBaseline) ? Math.round((rhr - hrBaseline) * 10) / 10 : null;
  const rhrStatus = rhrDelta === null ? "neutral"
    : rhrDelta <= -2 ? "good"
    : rhrDelta <= 2  ? "neutral"
    : rhrDelta <= 5  ? "off"
    : "bad";
  const rhrPct = rhr ? Math.max(0, Math.min(1, 1 - (rhr - 30) / 50)) : 0;
  const rhrColour = rhrStatus === "good" ? "#19E785" : rhrStatus === "neutral" ? "#FFFF00" : "#EC9649";

  // steps
  const steps = metrics?.steps;
  const stepTarget = 10000;
  const stepPct = steps ? Math.min(1, steps / stepTarget) : 0;
  const stepStatus = !steps ? "neutral"
    : steps >= 10000 ? "good"
    : steps >= 7000  ? "neutral"
    : steps >= 4000  ? "off"
    : "bad";
  const stepColour = stepStatus === "good" ? "#19E785" : stepStatus === "neutral" ? "#FFFF00" : "#EC9649";

  // body weight from most recent InBody scan (passed via metrics or body prop)
const weight = body?.weight_kg || metrics?.weight_kg || null;
  const weightStatus = "neutral"; // weight is informational, not good/bad
  const weightPct = weight ? Math.min(1, Math.max(0, 1 - (weight - 55) / 30)) : 0;
  const weightColour = "#59CEF1";

  return (
    <div style={HC.grid}>
      <MiniCard
        title="Resting HR"
        icon="♥"
        gauge={{ pct: rhrPct, colour: rhrColour, size: 76, label: rhr ? `${Math.round(rhr)}` : "—" }}
        bigNum={rhr ? `${Math.round(rhr)}` : "—"}
        bigUnit="bpm"
        sub={rhrDelta !== null ? `${rhrDelta >= 0 ? "+" : ""}${rhrDelta} vs baseline` : "Building baseline"}
        status={rhrStatus}
        pending={pending && !rhr}
      />
      <MiniCard
        title="Steps"
        icon="◎"
        gauge={{ pct: stepPct, colour: stepColour, size: 76, label: steps ? `${(steps/1000).toFixed(1)}k` : "—" }}
        bigNum={steps ? steps.toLocaleString() : "—"}
        sub={`of ${stepTarget.toLocaleString()}`}
        status={stepStatus}
        pending={pending && !steps}
      />
      <MiniCard
        title="Weight"
        icon="⊕"
        gauge={{ pct: weightPct, colour: weightColour, size: 76, label: weight ? `${weight.toFixed(1)}` : "—" }}
        bigNum={weight ? weight.toFixed(1) : "—"}
        bigUnit="kg"
        sub="InBody scan"
        status={weightStatus}
        pending={!weight}
      />
    </div>
  );
}

const HC = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
  },
  card: {
    background: "#0D0D0B",
    border: "1px solid #1A1A18",
    borderRadius: 14,
    padding: "12px 10px 10px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    transition: "box-shadow 0.3s ease",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  icon: { fontSize: 11, color: "#6A6A63" },
  cardTitle: { fontSize: 10, color: "#6A6A63", letterSpacing: 0.5, fontWeight: 500 },
  gaugeWrap: { margin: "4px 0 2px" },
  bigRow: { display: "flex", alignItems: "baseline", gap: 3 },
  bigNum: { fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: -0.5 },
  bigUnit: { fontSize: 10, color: "#6A6A63" },
  sub: { fontSize: 10, color: "#6A6A63", marginTop: 3, textAlign: "center" },
  pending: { fontSize: 10, color: "#3A3A38", textAlign: "center", padding: "16px 0", lineHeight: 1.4 },
};