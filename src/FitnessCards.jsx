import React from "react";

const EXPLAINERS = {
  vdot: {
    title: "VDOT",
    body: "A number representing current running fitness, derived from training paces. Developed by coach Jack Daniels. Your sub-2:30 marathon requires a VDOT of around 55.",
  },
  ctl: {
    title: "CTL: Chronic Training Load",
    body: "Your 42-day rolling average of daily training load. A rising CTL means you are getting fitter. Sub-2:30 athletes typically sustain a CTL of 90 to 110.",
  },
  tsb: {
    title: "TSB: Training Stress Balance",
    body: "CTL minus ATL (your 7-day acute load). Positive means fresher than your fitness baseline. Most productive training happens between -10 and -30.",
  },
  paceAtHr: {
    title: "Pace at 140 bpm",
    body: "Your average pace at around 140 bpm versus four weeks ago. Running faster at the same heart rate means your aerobic system is improving.",
  },
};

function tsbColour(tsb) {
  if (tsb === null || tsb === undefined) return "var(--ink-low)";
  if (tsb >= 5)   return "var(--pos)";
  if (tsb >= -5)  return "var(--accent)";
  if (tsb >= -15) return "var(--warn)";
  return "var(--alert)";
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
  if (isNeutral) return <span style={{ color: "var(--ink-low)", fontSize: 12 }}>→</span>;
  return (
    <span style={{ color: isGood ? "var(--pos)" : "var(--warn)", fontSize: 12, marginLeft: 3 }}>
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
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      <circle
        cx={parseFloat(pts[pts.length - 1].split(",")[0])}
        cy={parseFloat(pts[pts.length - 1].split(",")[1])}
        r="2.5"
        fill="var(--accent)"
      />
    </svg>
  );
}

function FitnessCard({ title, main, sub, metricKey, children }) {
  const explainer = EXPLAINERS[metricKey];
  return (
    <div style={FC.card}>
      <div style={FC.cardTop}>
        <span style={FC.label}>{title}</span>
      </div>
      <div style={FC.mainRow}>
        <span style={FC.main}>{main ?? "—"}</span>
        {children}
      </div>
      {sub && <div style={FC.sub}>{sub}</div>}
      {explainer && (
        <details style={FC.details}>
          <summary style={FC.summary}>
            <span style={FC.summaryLabel}>WHAT IS THIS</span>
            <svg style={FC.chev} width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.6"/>
            </svg>
          </summary>
          <p style={FC.explainerBody}>{explainer.body}</p>
        </details>
      )}
    </div>
  );
}

export function FitnessCards({ fitness }) {
  if (!fitness) return null;

  const { vdot, vdotTrend, ctl, tsb, ctlSparkline, paceAtHr, paceAtHrDelta, predictedMarathon } = fitness;
  const tsbColor = tsbColour(tsb);

  const analysis = (() => {
    if (!vdot || ctl === null || ctl === undefined) return null;
    const ctlLow = ctl < 15;
    const tsbNeg = tsb !== null && tsb < -5;
    const tsbPos = tsb !== null && tsb > 5;
    const paceGood = paceAtHrDelta !== null && paceAtHrDelta < -2;
    const paceBad  = paceAtHrDelta !== null && paceAtHrDelta > 2;
    if (ctlLow && tsbPos)  return "Low fitness base but fresh. Good window to start building volume.";
    if (ctlLow && tsbNeg)  return "Low fitness base and carrying fatigue. Prioritise consistency over intensity.";
    if (!ctlLow && tsbNeg) return "Solid base but currently fatigued. A down week may be due.";
    if (!ctlLow && tsbPos && paceGood) return "Strong base, fresh, and getting faster at the same effort.";
    if (!ctlLow && tsbPos) return "Solid base and fresh. Well placed for a quality session.";
    if (paceBad) return "Pace at this heart rate has slowed. Worth checking sleep, stress, or recent load.";
    return "Building consistent data. Trends will sharpen over the next few weeks.";
  })();

  return (
    <>
      <div style={FC.grid}>
        <FitnessCard title="VDOT" metricKey="vdot"
          main={vdot ?? "—"}
          sub={predictedMarathon ? `~${predictedMarathon} marathon` : "Building data"}>
          <TrendArrow delta={vdotTrend} />
        </FitnessCard>

        <FitnessCard title="FITNESS (CTL)" metricKey="ctl"
          main={ctl?.toFixed(1) ?? "—"}
          sub="42-day load">
          <div style={{ marginLeft: 6 }}>
            <Sparkline values={ctlSparkline} />
          </div>
        </FitnessCard>

        <FitnessCard title="FORM (TSB)" metricKey="tsb"
          main={tsb !== null ? (tsb >= 0 ? `+${tsb}` : `${tsb}`) : "—"}
          sub={tsbLabel(tsb)}>
          <span style={{ fontSize: 11, color: tsbColor, marginLeft: 6, fontWeight: 600 }}>
            {tsbLabel(tsb)}
          </span>
        </FitnessCard>

        <FitnessCard title="PACE @ 140BPM" metricKey="paceAtHr"
          main={paceAtHr ?? "—"}
          sub={paceAtHrDelta !== null
            ? paceAtHrDelta < 0 ? `${Math.abs(paceAtHrDelta)}s/km faster`
            : paceAtHrDelta > 0 ? `${paceAtHrDelta}s/km slower`
            : "No change"
            : "vs 4 weeks ago"}>
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
    gap: 8,
    marginBottom: 10,
  },
  card: {
    background: "var(--ground-1)",
    border: "1px solid var(--line)",
    borderRadius: "var(--r-s)",
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  cardTop: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  label: { fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--ink-low)", letterSpacing: ".14em", textTransform: "uppercase" },
  mainRow: { display: "flex", alignItems: "center", gap: 4, marginTop: 4 },
  main: { fontFamily: "var(--disp)", fontSize: 28, fontWeight: 700, color: "var(--ink-hi)", letterSpacing: -.5, lineHeight: 1 },
  sub: { fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-low)", marginTop: 2 },
  details: { marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--line)" },
  summary: { display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", listStyle: "none", minHeight: 28 },
  summaryLabel: { fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".16em", color: "var(--ink-low)", textTransform: "uppercase" },
  chev: { color: "var(--ink-low)", flexShrink: 0 },
  explainerBody: { fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-low)", lineHeight: 1.55, marginTop: 6 },
  analysisBox: {
    background: "var(--ground-1)",
    border: "1px solid var(--line)",
    borderRadius: "var(--r-s)",
    padding: "12px 14px",
    marginBottom: 10,
  },
  analysisLabel: { fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".16em", color: "var(--accent)", textTransform: "uppercase" },
  analysisText: { fontSize: 13, color: "var(--ink-mid)", lineHeight: 1.55, margin: "6px 0 0" },
};