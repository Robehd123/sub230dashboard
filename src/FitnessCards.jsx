// FitnessCards.jsx — four fitness metric cards plus plain-English analysis
// VDOT with trend, CTL with sparkline, TSB with status, Pace@HR trend

import React, { useState } from "react";

const YELLOW = "#FFFF00";
const GREEN  = "#19E785";
const ORANGE = "#EC9649";
const RED    = "#F87171";

const EXPLAINERS = {
  vdot: {
    title: "VDOT",
    body: "A number that represents your current running fitness, derived from your training paces. Developed by coach Jack Daniels. A higher VDOT means faster prescribed training paces. Your sub-2:30 marathon requires a VDOT of around 55. Think of it as your running fitness score.",
  },
  ctl: {
    title: "CTL — Chronic Training Load",
    body: "Your 42-day rolling average of daily training load. It represents your fitness base: how much training stress your body is adapted to absorb. A rising CTL means you are getting fitter. Sub-2:30 athletes typically sustain a CTL of 90-110+. The sparkline shows how yours has trended over recent weeks.",
  },
  tsb: {
    title: "TSB — Training Stress Balance",
    body: "CTL minus ATL (your 7-day acute load). It is your form score. Positive means you are fresher than your fitness baseline — good before a race or a key session. Negative means you are carrying fatigue. Most productive training happens between -10 and -30. Above +10 you may be undertraining.",
  },
  paceAtHr: {
    title: "Pace at 140 bpm",
    body: "Your average running pace when your heart rate is around 140 bpm, compared to four weeks ago. If you are running faster at the same heart rate, your aerobic system is improving. This is one of the clearest long-term signals of marathon fitness development.",
  },
};

function tsbColour(tsb) {
  if (tsb === null || tsb === undefined) return "#5A5A55";
  if (tsb >= 5)   return GREEN;
  if (tsb >= -5)  return YELLOW;
  if (tsb >= -15) return ORANGE;
  return RED;
}

function tsbLabel(tsb) {
  if (tsb === null || tsb === undefined) return "No data";
  if (tsb >= 10)  return "Fresh";
  if (tsb >= 0)   return "Neutral";
  if (tsb >= -10) return "Tired";
  return "Fatigued";
}

function TrendArrow({ delta, invert = false }) {
  if (delta === null || delta === undefined) return null;
  const isGood = invert ? delta < 0 : delta > 0;
  const isNeutral = Math.abs(delta) < 0.5;
  if (isNeutral) return <span style={{ color: "#5A5A55", fontSize: 12 }}>→</span>;
  return (
    <span style={{ color: isGood ? GREEN : ORANGE, fontSize: 12, marginLeft: 3 }}>
      {isGood ? "↑" : "↓"}
    </span>
  );
}

function Sparkline({ values, width = 60, height = 24 }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={YELLOW}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <circle
        cx={parseFloat(pts[pts.length - 1].split(",")[0])}
        cy={parseFloat(pts[pts.length - 1].split(",")[1])}
        r="2.5"
        fill={YELLOW}
      />
    </svg>
  );
}

function InfoButton({ metricKey }) {
  const [open, setOpen] = useState(false);
  const explainer = EXPLAINERS[metricKey];
  if (!explainer) return null;

  return (
    <div style={FC.infoWrap}>
      <button
        style={FC.infoBtn}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        aria-label={`Explain ${explainer.title}`}
        title={explainer.title}
      >
        ?
      </button>
      {open && (
        <>
          <div style={FC.backdrop} onClick={() => setOpen(false)} />
          <div style={FC.tooltip} onClick={e => e.stopPropagation()}>
            <div style={FC.tooltipTitle}>{explainer.title}</div>
            <p style={FC.tooltipBody}>{explainer.body}</p>
            <button style={FC.tooltipClose} onClick={() => setOpen(false)}>✕</button>
          </div>
        </>
      )}
    </div>
  );
}

function FitnessCard({ title, icon, main, sub, glow, metricKey, children }) {
  return (
    <div style={{ ...FC.card, boxShadow: glow ? `0 0 16px 3px ${glow}` : "none", position: "relative" }}>
      <div style={FC.cardTop}>
        <span style={FC.icon}>{icon}</span>
        <span style={FC.label}>{title}</span>
        <div style={{ marginLeft: "auto" }}>
          <InfoButton metricKey={metricKey} />
        </div>
      </div>
      <div style={FC.mainRow}>
        <span style={FC.main}>{main ?? "—"}</span>
        {children}
      </div>
      {sub && <div style={FC.sub}>{sub}</div>}
    </div>
  );
}

export function FitnessCards({ fitness }) {
  if (!fitness) return null;

  const { vdot, vdotTrend, ctl, tsb, ctlSparkline, paceAtHr, paceAtHrDelta, predictedMarathon } = fitness;
  const tsbColor = tsbColour(tsb);

  // brief plain-English analysis of the four numbers together
  const analysis = (() => {
    if (!vdot || ctl === null || ctl === undefined) return null;
    const ctlLow = ctl < 15;
    const tsbNeg = tsb !== null && tsb < -5;
    const tsbPos = tsb !== null && tsb > 5;
    const paceGood = paceAtHrDelta !== null && paceAtHrDelta < -2;
    const paceBad = paceAtHrDelta !== null && paceAtHrDelta > 2;

    if (ctlLow && tsbPos) return "Low fitness base but fresh — good window to start building volume.";
    if (ctlLow && tsbNeg) return "Low fitness base and carrying fatigue — prioritise consistency over intensity.";
    if (!ctlLow && tsbNeg) return "Solid base but currently fatigued — a down week may be due.";
    if (!ctlLow && tsbPos && paceGood) return "Strong base, fresh, and getting faster at the same effort — good form right now.";
    if (!ctlLow && tsbPos) return "Solid base and fresh — well placed for a quality session.";
    if (paceBad) return "Pace at this heart rate has slowed — worth checking sleep, stress, or recent load.";
    return "Building consistent data — trends will sharpen over the next few weeks.";
  })();

  return (
    <>
      <div style={FC.grid}>

        <FitnessCard
          title="VDOT"
          icon="◈"
          metricKey="vdot"
          main={vdot ?? "—"}
          sub={predictedMarathon ? `~${predictedMarathon} marathon` : "Building data"}
          glow="rgba(255,255,0,0.14)"
        >
          <TrendArrow delta={vdotTrend} />
        </FitnessCard>

        <FitnessCard
          title="Fitness (CTL)"
          icon="◉"
          metricKey="ctl"
          main={ctl?.toFixed(1) ?? "—"}
          sub="42-day load"
          glow={ctl > 8 ? "rgba(25,231,133,0.12)" : "rgba(255,255,255,0.05)"}
        >
          <div style={{ marginLeft: 6 }}>
            <Sparkline values={ctlSparkline} />
          </div>
        </FitnessCard>

        <FitnessCard
          title="Form (TSB)"
          icon="◎"
          metricKey="tsb"
          main={tsb !== null ? (tsb >= 0 ? `+${tsb}` : `${tsb}`) : "—"}
          sub={tsbLabel(tsb)}
          glow={tsb !== null ? `${tsbColor}25` : "rgba(255,255,255,0.05)"}
        >
          <span style={{ fontSize: 11, color: tsbColor, marginLeft: 6, fontWeight: 600 }}>
            {tsbLabel(tsb)}
          </span>
        </FitnessCard>

        <FitnessCard
          title="Pace @ 140bpm"
          icon="♡"
          metricKey="paceAtHr"
          main={paceAtHr ?? "—"}
          sub={paceAtHrDelta !== null
            ? paceAtHrDelta < 0
              ? `${Math.abs(paceAtHrDelta)}s/km faster`
              : paceAtHrDelta > 0
              ? `${paceAtHrDelta}s/km slower`
              : "No change"
            : "vs 4 weeks ago"}
          glow={paceAtHrDelta !== null && paceAtHrDelta < 0 ? "rgba(25,231,133,0.12)" : "rgba(255,255,255,0.05)"}
        >
          <TrendArrow delta={paceAtHrDelta} invert={true} />
        </FitnessCard>

      </div>

      {analysis && (
        <div style={FC.analysisBox}>
          <span style={FC.analysisLabel}>READING THE NUMBERS</span>
          <p style={FC.analysisText}>{analysis}</p>
        </div>
      )}
    </>
  );
}

const FC = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 10,
    marginBottom: 10,
  },
  card: {
    background: "#0D0D0B",
    border: "1px solid #1A1A18",
    borderRadius: 14,
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    transition: "box-shadow 0.3s ease",
    overflow: "visible",
  },
  cardTop: { display: "flex", alignItems: "center", gap: 5 },
  icon: { fontSize: 10, color: "#5A5A55" },
  label: { fontSize: 10, color: "#6A6A63", letterSpacing: 0.5, fontWeight: 500 },
  mainRow: { display: "flex", alignItems: "center", gap: 4, marginTop: 2 },
  main: { fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: -0.5, lineHeight: 1 },
  sub: { fontSize: 11, color: "#6A6A63", marginTop: 2 },
  infoWrap: { position: "relative", display: "inline-block" },
  infoBtn: {
    width: 16, height: 16, borderRadius: "50%",
    border: "1px solid #2A2A28", background: "#111110", color: "#6A6A63",
    fontSize: 9, fontWeight: 700, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 0, lineHeight: 1, transition: "border-color 0.15s, color 0.15s",
  },
  backdrop: { position: "fixed", inset: 0, zIndex: 98 },
  tooltip: {
    position: "absolute", top: 22, right: 0, width: 220,
    background: "#141412", border: "1px solid #2A2A28", borderRadius: 12,
    padding: "14px 14px 12px", zIndex: 99, boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
  },
  tooltipTitle: { fontSize: 12, fontWeight: 700, color: YELLOW, marginBottom: 8, letterSpacing: 0.3 },
  tooltipBody: { fontSize: 12, color: "#A8A8A0", lineHeight: 1.6, margin: 0 },
  tooltipClose: { position: "absolute", top: 10, right: 10, background: "none", border: "none", color: "#5A5A55", cursor: "pointer", fontSize: 11, padding: 2 },
  analysisBox: {
    background: "#0D0D0B",
    border: "1px solid #1A1A18",
    borderRadius: 14,
    padding: "12px 14px",
    marginBottom: 14,
  },
  analysisLabel: { fontSize: 9, color: "#6A6A63", letterSpacing: 1.2, fontWeight: 600 },
  analysisText: { fontSize: 13, color: "#C2C2BA", lineHeight: 1.5, margin: "6px 0 0" },
};