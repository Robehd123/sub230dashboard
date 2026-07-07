import React, { useState, useEffect } from "react";
import { ActivityCalendar } from "./Calendar.jsx";
import { HealthCards } from "./HealthCards.jsx";
import { FitnessCards } from "./FitnessCards.jsx";
import { ActivityFeedbackCard } from "./ActivityFeedbackCard.jsx";
import { AthleteNotes } from "./AthleteNotes.jsx";
import { BodyCard } from "./BodyCard.jsx";
import { BACKEND, ACTIVITY_COLOURS, WEEKLY_TARGET_KM } from "./config.js";

// ---- formatting helpers ----

function fmtType(t) {
  return { easy: "Easy", long: "Long", threshold: "Threshold", intervals: "Intervals", strength: "Strength", swim: "Swim" }[t] || t;
}

function fmtPace(distM, timeS) {
  if (!distM || !timeS) return null;
  const secPerKm = timeS / (distM / 1000);
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60).toString().padStart(2, "0");
  return `${min}:${sec}/km`;
}

function fmtDist(m) { return (m / 1000).toFixed(1) + " km"; }
function fmtTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getTodayKey() {
  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()];
}

// ---- week strip ----

const WEEK_SCHEDULE = [
  { d: "Mon", label: "Gym: legs",        type: "strength"  },
  { d: "Tue", label: "Commute + track",  type: "intervals" },
  { d: "Wed", label: "Commute",          type: "easy"      },
  { d: "Thu", label: "Treadmill reps",   type: "intervals" },
  { d: "Fri", label: "Commute",          type: "easy"      },
  { d: "Sat", label: "Long run",         type: "long"      },
  { d: "Sun", label: "Easy or swim",     type: "easy"      },
];

function buildWeekStrip(activities) {
  const todayKey = getTodayKey();
  const actsByDay = {};
  (activities || []).forEach(a => {
    const key = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(a.start_date).getDay()];
    actsByDay[key] = (actsByDay[key] || []).concat(a);
  });
  return WEEK_SCHEDULE.map(s => ({
    ...s,
    done: !!actsByDay[s.d],
    today: s.d === todayKey,
    km: actsByDay[s.d] ? actsByDay[s.d].reduce((sum, a) => sum + a.distance_m / 1000, 0) : 0,
  }));
}

// map today to the plan session key
const DAY_TO_PLAN = {
  Mon: "monday", Tue: "tuesday", Wed: "wednesday",
  Thu: "thursday", Fri: "friday", Sat: "saturday", Sun: "sunday",
};

// ---- helper: extract text from weekFocus or keyLever (handles both old string and new {summary,body} shape) ----
function focusSummary(val) {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (typeof val === "object" && val.summary) return String(val.summary);
  return null;
}
function focusBody(val) {
  if (!val) return null;
  if (typeof val === "string") return null;
  if (typeof val === "object" && val.body) return String(val.body);
  return null;
}
// Safe string renderer: prevents React error #31 when an API field is unexpectedly an object
function safeStr(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") return val;
  if (typeof val === "object") return val.summary ? String(val.summary) : null;
  return String(val);
}

// ---- dashboard ----

export default function Dashboard() {
  const [liveData, setLiveData]         = useState(null);
  const [calendarData, setCalendarData] = useState(null);
  const [plan, setPlan]                 = useState(null);
  const [nextWeekPlan, setNextWeekPlan] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  useEffect(() => {
    const todayNum = new Date().getDay();
    const isWeekend = todayNum === 0 || todayNum === 6;

    Promise.all([
      fetch(`${BACKEND}/api/dashboard`).then(r => r.json()),
      fetch(`${BACKEND}/api/plan`).then(r => r.json()),
      fetch(`${BACKEND}/api/calendar?days=84`).then(r => r.json()).catch(() => ({})),
      isWeekend
        ? fetch(`${BACKEND}/api/plan?next=true`).then(r => r.json()).catch(() => null)
        : Promise.resolve(null),
    ]).then(([dash, planData, cal, nextPlan]) => {
      setLiveData(dash);
      setPlan(planData);
      setCalendarData(cal);
      if (isWeekend && nextPlan && !nextPlan.error) setNextWeekPlan(nextPlan);
      setLoading(false);
    }).catch(() => { setError("Could not reach backend"); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ ...S.root, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: "var(--accent)", fontFamily: "var(--disp)", marginBottom: 12 }}>Sub230</div>
        <div style={{ color: "var(--ink-low)", fontSize: 14 }}>Loading your plan…</div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ ...S.root, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", padding: 24 }}>
        <div style={{ color: "var(--warn)", fontSize: 14, marginBottom: 8 }}>Connection error</div>
        <div style={{ color: "var(--ink-low)", fontSize: 12 }}>{error}</div>
      </div>
    </div>
  );

  const { week, readiness, series, recentActivities } = liveData;
  const weekStrip  = buildWeekStrip(week?.activities);
  const completed  = week?.completed || 0;
  const target     = week?.target || WEEKLY_TARGET_KM;
  const pct        = Math.min(100, Math.round((completed / target) * 100));
  const remaining  = Math.max(0, target - completed).toFixed(1);
  const isDownWeek = week?.isDownWeek;

  // use the new unified status object when available, fall back to legacy readiness.state
  const statusObj  = liveData?.status;
  const legacyState = readiness?.state || "ready";
  const statusWord  = statusObj?.word || { ready: "Ready", steady: "Caution", hold: "Hold" }[legacyState] || "Ready";
  const statusColour = statusObj
    ? { pos: "var(--pos)", warn: "var(--warn)", alert: "var(--alert)" }[statusObj.colour] || "var(--pos)"
    : { Ready: "var(--pos)", Caution: "var(--warn)", Hold: "var(--alert)" }[statusWord] || "var(--pos)";
  const statusDetail = statusObj?.detail || (readiness?.restHrDelta != null
    ? `RHR ${readiness.restHrDelta >= 0 ? "+" : ""}${readiness.restHrDelta} bpm`
    : "Health feed pending");

  const todayKey    = getTodayKey();
  const planKey     = DAY_TO_PLAN[todayKey];
  const planSession = plan?.sessions?.[planKey];
  const commuteSession = {
    type: "easy", title: "Easy commute run",
    summary: "Ten kilometres easy with the backpack.",
    detail: ["10 km easy pace", "Backpack load, aerobic base only"],
    rationale: "Commute runs form the aerobic spine of the week. Easy pace with a loaded pack builds aerobic capacity without accumulating meaningful fatigue.",
  };
  const session = planSession || commuteSession;

  const planKeyToDayNum = { monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6, sunday:0 };
  const todayNum = new Date().getDay();
  const isWeekend = todayNum === 0 || todayNum === 6;

  const allPlanKeys = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
  const thisWeekUpcoming = allPlanKeys
    .filter(k => {
      if (k === planKey) return false;
      const keyDay = planKeyToDayNum[k];
      const todayInWeek = todayNum === 0 ? 7 : todayNum;
      const keyInWeek   = keyDay  === 0 ? 7 : keyDay;
      if (keyInWeek <= todayInWeek) return false;
      return !!plan?.sessions?.[k];
    })
    .sort((a, b) => {
      const da    = planKeyToDayNum[a] === 0 ? 7 : planKeyToDayNum[a];
      const db2   = planKeyToDayNum[b] === 0 ? 7 : planKeyToDayNum[b];
      const today = todayNum === 0 ? 7 : todayNum;
      return (da  >= today ? da  - today : da  + 7 - today)
           - (db2 >= today ? db2 - today : db2 + 7 - today);
    })
    .map(k => ({ ...plan.sessions[k], dayLabel: k.charAt(0).toUpperCase() + k.slice(1), weekLabel: null }));

  const nwp = nextWeekPlan || liveData?.nextWeekPlan;
  const nextWeekUpcoming = (isWeekend && nwp?.sessions)
    ? ["monday","tuesday","thursday"].reduce((acc, k) => {
        if (nwp.sessions[k]) acc.push({ ...nwp.sessions[k], dayLabel: k.charAt(0).toUpperCase() + k.slice(1), weekLabel: "Next week" });
        return acc;
      }, []).slice(0, 3)
    : [];

  const upcoming = [...thisWeekUpcoming, ...nextWeekUpcoming].slice(0, 5);
  const progress = plan?.sub230Progress;

  return (
    <div style={S.pageWrap}>
      <style>{`
        @media (min-width: 768px) {
          .dash-root { max-width: 1100px !important; height: auto !important; border-radius: 24px !important; }
          .dash-scroll { height: auto !important; overflow-y: visible !important; padding: 28px 32px 0 !important; }
          .dash-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 24px; }
          .dash-fullwidth { margin-top: 28px; }
          .dash-strip { margin-bottom: 0 !important; }
        }
        @media (max-width: 767px) {
          .dash-columns { display: block; }
        }
      `}</style>

      <div className="dash-root" style={S.root}>
        <div className="dash-scroll" style={S.scroll}>

          {/* header */}
          <div style={S.header}>
            <span style={S.brand}>Sub<span style={{ color: "var(--accent)" }}>230</span></span>
            <span style={S.phasePill}>
              {plan?.phase ? plan.phase.charAt(0).toUpperCase() + plan.phase.slice(1) + " phase" : "Aerobic base"} · 2026
            </span>
          </div>

          <div className="dash-columns">

            {/* ---- LEFT ---- */}
            <div>

              {/* hero */}
              <div style={S.heroWrap}>
                <div style={S.eyebrow}>THIS WEEK</div>
                <div style={S.heroRow}>
                  <span style={S.heroNum}>{completed.toFixed(1)}</span>
                  <span style={S.heroUnit}>/ {target} km</span>
                </div>
                <div style={S.heroSub}>
                  {isDownWeek
                    ? <span><span style={{ color: "var(--warn)" }}>Down week</span> · {remaining} km to planned target</span>
                    : <span>{remaining} km remaining · {pct}% complete</span>
                  }
                </div>
                <div style={S.barTrack}>
                  <div style={{ ...S.barFill, width: `${pct}%`, background: isDownWeek ? "var(--warn)" : "var(--accent)" }} />
                </div>
                <div style={{ ...S.readyPill, borderColor: `${statusColour}55` }}>
                  <span style={{ ...S.readyDot, background: statusColour }} />
                  <span style={S.readyLabel}>{statusWord}</span>
                  <span style={S.readyDelta}>{statusDetail}</span>
                </div>
              </div>

              {/* week strip */}
              <div className="dash-strip" style={S.strip}>
                {weekStrip.map(x => (
                  <div key={x.d} style={S.stripCol}>
                    <div style={{
                      ...S.stripDot,
                      background: x.done ? ACTIVITY_COLOURS[x.type] : "transparent",
                      border: x.done ? "none" : `1.5px solid ${x.today ? "var(--accent)" : "var(--line)"}`,
                    }} />
                    <span style={{ ...S.stripDay, color: x.today ? "var(--accent)" : "var(--ink-low)" }}>{x.d}</span>
                    {x.done && x.km > 0 && <span style={S.stripKm}>{x.km.toFixed(0)}km</span>}
                  </div>
                ))}
              </div>

              {/* week focus */}
              {plan?.weekFocus && (
                <div style={S.focusBanner}>
                  <span style={S.focusLabel}>WEEK FOCUS</span>
                  <p style={S.focusText}>{focusSummary(plan.weekFocus)}</p>
                  {focusBody(plan.weekFocus) && (
                    <p style={{ ...S.focusText, marginTop: 6, color: "var(--ink-low)" }}>{focusBody(plan.weekFocus)}</p>
                  )}
                </div>
              )}

              {/* today session */}
              <div style={S.sectionLabel}>TODAY · {todayKey.toUpperCase()}</div>
              <div style={S.card}>
                <div style={S.cardHead}>
                  <span style={{ ...S.typeTag, background: ACTIVITY_COLOURS[session.type] || ACTIVITY_COLOURS.easy, color: "var(--ground-0)" }}>
                    {fmtType(session.type)}
                  </span>
                </div>
                <div style={S.cardTitle}>{session.title}</div>
                {(session.detail || []).map((d, i) => (
                  <div key={i} style={S.bulletRow}>
                    <span style={S.bullet}>▸</span>
                    <span style={S.bulletText}>{d}</span>
                  </div>
                ))}
                {(session.summary || session.rationale) && (
                  <div style={S.why}>
                    <span style={S.whyLabel}>WHY</span>
                    {session.summary && <p style={S.whySummary}>{session.summary}</p>}
                    {session.rationale && <p style={S.whyText}>{session.rationale}</p>}
                  </div>
                )}
              </div>

              {/* journal */}
              <AthleteNotes latestNote={liveData?.latestNote} />
            </div>

            {/* ---- RIGHT ---- */}
            <div>

              {/* coming up */}
              {upcoming.length > 0 && (
                <>
                  <div style={S.sectionLabel}>COMING UP</div>
                  {upcoming.map((u, i) => (
                    <div key={i} style={S.card}>
                      <div style={S.upHead}>
                        <span style={{ ...S.typeDot, background: ACTIVITY_COLOURS[u.type] || ACTIVITY_COLOURS.easy }} />
                        <span style={S.upDay}>{u.dayLabel}</span>
                        {u.weekLabel && <span style={{ fontSize: 10, color: "var(--accent)", opacity: 0.7, marginLeft: 6, fontWeight: 600 }}>{u.weekLabel}</span>}
                      </div>
                      <div style={S.upTitle}>{u.title}</div>
                      {u.summary && <p style={S.upSummary}>{u.summary}</p>}
                      {(u.detail || []).slice(0, 2).map((d, j) => (
                        <div key={j} style={S.bulletRow}>
                          <span style={S.bullet}>▸</span>
                          <span style={S.bulletText}>{d}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}

              {/* fitness metrics */}
              <div style={S.sectionLabel}>FITNESS METRICS</div>
              <FitnessCards fitness={liveData?.fitness} />

              {/* sub-2:30 progress */}
              {progress && (
                <>
                  <div style={S.sectionLabel}>SUB 2:30 PROGRESS</div>
                  <div style={S.card}>
                    <div style={S.progressRow}>
                      <div style={S.progressStat}>
                        <div style={S.progressNum}>{safeStr(progress.currentEquivalent)}</div>
                        <div style={S.progressLabel}>Current equivalent</div>
                      </div>
                      <div style={S.progressDivider} />
                      <div style={S.progressStat}>
                        <div style={{ ...S.progressNum, color: progress.onTrack ? "var(--pos)" : "var(--warn)" }}>
                          {progress.onTrack ? "On track" : "Off track"}
                        </div>
                        <div style={S.progressLabel}>vs sub-2:30 target</div>
                      </div>
                    </div>
                    {safeStr(plan?.progressNote) && <p style={S.whyText}>{safeStr(plan.progressNote)}</p>}
                    {progress.keyLever && (
                      <div style={S.keyLever}>
                        <span style={S.whyLabel}>KEY LEVER</span>
                        <p style={{ ...S.whySummary, color: "var(--accent)" }}>{focusSummary(progress.keyLever)}</p>
                        {focusBody(progress.keyLever) && (
                          <p style={{ ...S.whyText, marginTop: 6 }}>{focusBody(progress.keyLever)}</p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* recent runs */}
              <div style={S.sectionLabel}>RECENT RUNS</div>
              {(recentActivities || []).slice(0, 4).map((a, i) => (
                <ActivityFeedbackCard
                  key={i}
                  activity={a}
                  typeColour={ACTIVITY_COLOURS[a.type] || ACTIVITY_COLOURS.easy}
                  fmtDist={fmtDist}
                  fmtTime={fmtTime}
                  fmtPace={fmtPace}
                  recentFeedback={liveData?.recentFeedback}
                />
              ))}
            </div>
          </div>

          {/* ---- FULL WIDTH ---- */}
          <div className="dash-fullwidth">

            <div style={S.sectionLabel}>VOLUME · LAST 8 WEEKS</div>
            <div style={S.card}>
              <VolumeChart series={series} />
              <div style={S.legendRow}>
                <span style={S.legendItem}><span style={{ ...S.legendSwatch, background: "var(--run)" }} /> Build week</span>
                <span style={S.legendItem}><span style={{ ...S.legendSwatch, background: "var(--warn)" }} /> Down week</span>
                <span style={S.legendItem}><span style={{ ...S.legendSwatch, background: "rgba(245,185,21,0.2)", border: "1px dashed rgba(245,185,21,0.4)" }} /> Target</span>
              </div>
            </div>

            <div style={S.sectionLabel}>HEALTH · TODAY</div>
            <HealthCards
              metrics={{
                resting_hr:        readiness?.restingHr,
                sleep_score:       readiness?.sleepScore,
                sleep_duration_min: readiness?.sleepDuration,
                steps:             readiness?.steps,
                respiratory_rate:  readiness?.respiratoryRate,
                weight_kg:         liveData?.body?.weight_kg || null,
              }}
              hrBaseline={readiness?.hrBaseline}
            />

            <BodyCard body={liveData?.body} />

            <div style={{ ...S.sectionLabel, marginTop: 20 }}>ACTIVITY · LAST 12 WEEKS</div>
            <div style={{ ...S.card, paddingLeft: 28 }}>
              <ActivityCalendar
                calendarData={calendarData}
                streak={liveData?.streak}
                weekMinutes={liveData?.weekMinutes}
                activeWeeks={liveData?.activeWeeks}
              />
            </div>

            <div style={S.sectionLabel}>GOAL</div>
            <div style={S.card}>
              <div style={S.raceNum}>Sub 2:30</div>
              <div style={S.cardDetail}>Target window · late 2027</div>
              <p style={S.whyText}>No fixed date yet. The plan locks to a precise countdown once a race is chosen.</p>
            </div>

            <div style={S.footer}>
              Live data · last sync {new Date(liveData.lastSync).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- volume chart (bars, not line) ----

function VolumeChart({ series }) {
  if (!series?.actual?.length) return null;
  const W = 320, H = 160, padL = 32, padR = 12, padT = 16, padB = 24;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const n       = series.weeks.length;
  const actuals = series.actual.filter(v => v != null && v > 0);
  const maxVal  = Math.max(...(series.target || []), ...actuals, 20) * 1.15;
  const barW    = (chartW / n) * 0.6;
  const gap     = (chartW / n) * 0.4;
  const xLeft   = i => padL + i * (chartW / n) + gap / 2;
  const yPos    = v => padT + chartH * (1 - v / maxVal);
  const tgtY    = series.target?.[0] ? yPos(series.target[0]) : null;
  const gridStep = maxVal > 100 ? 40 : 20;
  const gridVals = [];
  for (let v = 0; v <= maxVal; v += gridStep) gridVals.push(v);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} role="img" aria-label="Weekly running volume">
      {gridVals.map(v => (
        <g key={v}>
          <line x1={padL} y1={yPos(v)} x2={W - padR} y2={yPos(v)} stroke="var(--line)" strokeWidth="1" />
          <text x={padL - 4} y={yPos(v) + 3.5} textAnchor="end" fontSize="8" fill="var(--ink-low)" fontFamily="var(--mono)">{v}</text>
        </g>
      ))}
      {tgtY && (
        <>
          <line x1={padL} y1={tgtY} x2={W - padR} y2={tgtY} stroke="var(--accent)" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
          <text x={W - padR} y={tgtY - 3} textAnchor="end" fontSize="8" fill="var(--accent)" fontFamily="var(--mono)" opacity="0.7">TGT</text>
        </>
      )}
      {series.weeks.map((wk, i) => {
        const val = series.actual[i];
        if (!val || val <= 0) return null;
        const barH  = chartH * (val / maxVal);
        const isDown = series.down?.[i];
        return (
          <rect
            key={i}
            x={xLeft(i)} y={yPos(val)}
            width={barW} height={barH}
            rx="3"
            fill={isDown ? "var(--warn)" : "var(--run)"}
            opacity="0.85"
          />
        );
      })}
      {series.weeks.map((wk, i) => (
        <text key={i} x={xLeft(i) + barW / 2} y={H - 6} textAnchor="middle" fontSize="7.5" fill="var(--ink-low)" fontFamily="var(--mono)">{wk}</text>
      ))}
    </svg>
  );
}

// ---- styles ----

const S = {
  pageWrap: { minHeight: "100dvh", background: "var(--ground-0)", display: "flex", alignItems: "flex-start", justifyContent: "center" },
  root: {
    position: "relative", width: "100%", maxWidth: 420, margin: "0 auto",
    minHeight: "100dvh", background: "var(--ground-0)",
    fontFamily: "var(--body)", color: "var(--ink-hi)", overflow: "hidden",
  },
  scroll: { position: "relative", zIndex: 1, padding: "20px 18px 0", boxSizing: "border-box" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 },
  brand: { fontWeight: 800, fontSize: 18, letterSpacing: 2, fontFamily: "var(--disp)", color: "var(--ink-hi)" },
  phasePill: { fontSize: 11, color: "var(--ink-mid)", background: "var(--ground-1)", padding: "5px 11px", borderRadius: 12, fontFamily: "var(--mono)", letterSpacing: "0.1em" },
  heroWrap: { marginBottom: 22 },
  eyebrow: { fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.18em", color: "var(--ink-low)", marginBottom: 6 },
  heroRow: { display: "flex", alignItems: "baseline", gap: 10 },
  heroNum: { fontSize: 84, fontWeight: 800, lineHeight: 0.9, letterSpacing: -3, color: "var(--ink-hi)", fontFamily: "var(--disp)" },
  heroUnit: { fontSize: 26, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--disp)" },
  heroSub: { fontSize: 13, color: "var(--ink-mid)", marginTop: 10, fontFamily: "var(--mono)" },
  barTrack: { height: 5, background: "var(--ground-2)", borderRadius: 3, marginTop: 14, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3, transition: "width 0.4s ease" },
  readyPill: { display: "inline-flex", alignItems: "center", gap: 8, marginTop: 14, padding: "8px 12px", background: "var(--ground-1)", border: "1px solid", borderRadius: 99 },
  readyDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  readyLabel: { fontSize: 13, fontWeight: 600, color: "var(--ink-hi)" },
  readyDelta: { fontSize: 11, color: "var(--ink-low)", fontFamily: "var(--mono)" },
  strip: { display: "flex", justifyContent: "space-between", margin: "8px 0 20px" },
  stripCol: { display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flex: 1 },
  stripDot: { width: 22, height: 22, borderRadius: 7 },
  stripDay: { fontSize: 10, fontWeight: 500, fontFamily: "var(--mono)", letterSpacing: "0.08em" },
  stripKm: { fontSize: 9, color: "var(--ink-low)", fontFamily: "var(--mono)" },
  focusBanner: { background: "var(--ground-1)", border: "1px solid var(--line)", borderRadius: "var(--r)", padding: "12px 14px", marginBottom: 16 },
  focusLabel: { fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase" },
  focusText: { fontSize: 13, color: "var(--ink-mid)", margin: "5px 0 0", lineHeight: 1.55 },
  sectionLabel: { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.2em", color: "var(--ink-low)", textTransform: "uppercase", margin: "8px 2px 12px" },
  card: { background: "var(--ground-1)", border: "1px solid var(--line)", borderRadius: "var(--r)", padding: "16px 18px", marginBottom: 14, textAlign: "left" },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  typeTag: { fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500, padding: "4px 10px", borderRadius: "var(--r-s)", letterSpacing: "0.14em", textTransform: "uppercase" },
  cardTitle: { fontSize: 20, fontWeight: 700, marginBottom: 10, color: "var(--ink-hi)" },
  cardDetail: { fontSize: 13, color: "var(--ink-low)", fontFamily: "var(--mono)", marginBottom: 6 },
  bulletRow: { display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  bullet: { color: "var(--accent)", fontSize: 10, marginTop: 4, flexShrink: 0, opacity: 0.8 },
  bulletText: { fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-mid)", lineHeight: 1.55, flex: 1, letterSpacing: "0.02em" },
  why: { marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)" },
  whyLabel: { fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase" },
  whySummary: { fontSize: 13, color: "var(--ink-mid)", margin: "5px 0 0", lineHeight: 1.45 },
  whyText: { fontSize: 13, lineHeight: 1.6, color: "var(--ink-low)", margin: "6px 0 0" },
  upHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  typeDot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  upDay: { fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500, letterSpacing: "0.1em", color: "var(--ink-mid)", textTransform: "uppercase" },
  upTitle: { fontSize: 16, fontWeight: 650, marginBottom: 6, color: "var(--ink-hi)" },
  upSummary: { fontSize: 13, color: "var(--ink-mid)", marginBottom: 8, lineHeight: 1.45 },
  progressRow: { display: "flex", alignItems: "center", gap: 16, marginBottom: 14 },
  progressStat: { flex: 1, textAlign: "center" },
  progressNum: { fontFamily: "var(--disp)", fontSize: 28, fontWeight: 800, color: "var(--ink-hi)", letterSpacing: 0 },
  progressLabel: { fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-low)", marginTop: 4, letterSpacing: "0.1em" },
  progressDivider: { width: 1, height: 40, background: "var(--line)" },
  keyLever: { marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)" },
  legendRow: { display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" },
  legendItem: { display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-low)", letterSpacing: "0.08em" },
  legendSwatch: { width: 9, height: 9, borderRadius: 2, flexShrink: 0 },
  raceNum: { fontFamily: "var(--disp)", fontSize: 38, fontWeight: 800, color: "var(--ink-hi)", marginBottom: 8 },
  footer: { fontFamily: "var(--mono)", textAlign: "center", fontSize: 10, color: "var(--ink-low)", padding: "20px 0 28px", letterSpacing: "0.1em" },
};