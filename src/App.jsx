import React, { useState, useEffect, useRef } from "react";
import { ActivityCalendar } from "./Calendar.jsx";
import { HealthCards } from "./HealthCards.jsx";
import { FitnessCards } from "./FitnessCards.jsx";
import { ActivityFeedbackCard } from "./ActivityFeedbackCard.jsx";
import { AthleteNotes } from "./AthleteNotes.jsx";
import { BodyCard } from "./BodyCard.jsx";

const BACKEND = "https://sub230-backend.sub230.workers.dev";

const TIER = {
  easy:      "#FAE24A",  // yellow
  long:      "#EC9649",  // orange
  threshold: "#2DD4BF",  // teal
  intervals: "#19E785",  // green
  strength:  "#9D90FF",  // purple
  swim:      "#59CEF1",  // blue
  cycling:   "#F472B6",  // pink
  rest:      "#1C1C1A",
};
const YELLOW = "#FFFF00";

const WEEK_SCHEDULE = [
  { d: "Mon", label: "Gym · legs",       type: "strength"  },
  { d: "Tue", label: "Commute + track",  type: "intervals" },
  { d: "Wed", label: "Commute",          type: "easy"      },
  { d: "Thu", label: "Treadmill reps",   type: "intervals" },
  { d: "Fri", label: "Commute",          type: "easy"      },
  { d: "Sat", label: "Long run",         type: "long"      },
  { d: "Sun", label: "Easy + swim",      type: "easy"      },
];

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
const DAY_TO_PLAN = { Mon: "monday", Tue: "tuesday", Wed: "wednesday", Thu: "thursday", Fri: "friday", Sat: "saturday", Sun: "sunday" };

export default function Dashboard() {
  const [liveData, setLiveData]         = useState(null);
  const [calendarData, setCalendarData] = useState(null);
  const [plan, setPlan]                 = useState(null);
  const [nextWeekPlan, setNextWeekPlan] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [scrollY, setScrollY]           = useState(0);
  const scrollRef                       = useRef(null);

  useEffect(() => {
    const todayNum = new Date().getDay();
    const isWeekend = todayNum === 0 || todayNum === 6;

    Promise.all([
      fetch(`${BACKEND}/api/dashboard`).then(r => r.json()),
      fetch(`${BACKEND}/api/plan`).then(r => r.json()),
      fetch(`${BACKEND}/api/calendar?days=84`).then(r => r.json()).catch(() => ({})),
      // on weekends, trigger next week plan generation in background
      isWeekend
        ? fetch(`${BACKEND}/api/plan?next=true`).then(r => r.json()).catch(() => null)
        : Promise.resolve(null),
    ]).then(([dash, planData, cal, nextPlan]) => {
      setLiveData(dash);
      setPlan(planData);
      setCalendarData(cal);
      // if weekend and next week plan available, store it
      if (isWeekend && nextPlan && !nextPlan.error) {
        setNextWeekPlan(nextPlan);
      }
      setLoading(false);
    }).catch(() => { setError("Could not reach backend"); setLoading(false); });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const fn = () => setScrollY(el.scrollTop);
    el.addEventListener("scroll", fn, { passive: true });
    return () => el.removeEventListener("scroll", fn);
  }, []);

  const glowOpacity = Math.max(0, 1 - scrollY / 320);

  if (loading) return (
    <div style={{ ...S.root, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: YELLOW, marginBottom: 12 }}>Sub230</div>
        <div style={{ color: "#8A8A82", fontSize: 14 }}>Loading your plan…</div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ ...S.root, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", padding: 24 }}>
        <div style={{ color: TIER.long, fontSize: 14, marginBottom: 8 }}>Connection error</div>
        <div style={{ color: "#8A8A82", fontSize: 12 }}>{error}</div>
      </div>
    </div>
  );

  const { week, readiness, series, recentActivities } = liveData;
  const weekStrip  = buildWeekStrip(week?.activities);
  const completed  = week?.completed || 0;
  const target     = week?.target || 104;
  const pct        = Math.min(100, Math.round((completed / target) * 100));
  const remaining  = Math.max(0, target - completed).toFixed(1);
  const isDownWeek = week?.isDownWeek;

  const readyMap = {
    ready:  { dot: TIER.threshold, label: "Ready to go" },
    steady: { dot: TIER.easy,      label: "Steady" },
    hold:   { dot: TIER.long,      label: "Hold back today" },
  };
  const rd = readyMap[readiness?.state || "ready"];

  const todayKey   = getTodayKey();
  const planKey    = DAY_TO_PLAN[todayKey];
  const planSession = plan?.sessions?.[planKey];
  const commuteSession = {
    type: "easy", title: "Easy commute run",
    detail: ["10 km easy pace", "Backpack load — treat as aerobic base"],
    rationale: "Commute runs form the aerobic spine of your week. Easy pace with a loaded pack builds aerobic capacity without accumulating fatigue.",
  };
  const session = planSession || commuteSession;

  // map plan keys to day numbers (0=Sun, 1=Mon etc)
  const planKeyToDayNum = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 };
  const todayNum = new Date().getDay();
  const isWeekend = todayNum === 0 || todayNum === 6;

  const allPlanKeys = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
  const thisWeekUpcoming = allPlanKeys
    .filter(k => {
      if (k === planKey) return false;
      const keyDay = planKeyToDayNum[k];
      const todayInWeek = todayNum === 0 ? 7 : todayNum;
      const keyInWeek = keyDay === 0 ? 7 : keyDay;
      if (keyInWeek <= todayInWeek) return false;
      return !!plan?.sessions?.[k];
    })
    .sort((a, b) => {
      const da = planKeyToDayNum[a] === 0 ? 7 : planKeyToDayNum[a];
      const db2 = planKeyToDayNum[b] === 0 ? 7 : planKeyToDayNum[b];
      const today = todayNum === 0 ? 7 : todayNum;
      return (da >= today ? da - today : da + 7 - today) - (db2 >= today ? db2 - today : db2 + 7 - today);
    })
    .map(k => ({
      ...plan.sessions[k],
      dayLabel: k.charAt(0).toUpperCase() + k.slice(1),
      weekLabel: null,
    }));

  // on weekends, add next week's key sessions to Coming Up
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
          .dash-fullwidth {}
        }
      `}</style>

      <div className="dash-root" style={S.root}>
        <div style={{ ...S.glow, opacity: glowOpacity }} aria-hidden="true" />
        <div style={{ ...S.glowTop, opacity: glowOpacity }} aria-hidden="true" />
        {/* desktop: wide glow */}
        <div style={{ ...S.glowWide, opacity: glowOpacity }} aria-hidden="true" />

        <div className="dash-scroll" ref={scrollRef} style={S.scroll}>

          {/* header */}
          <div style={S.header}>
            <span style={S.brand}>Sub230</span>
            <span style={S.phasePill}>
              {plan?.phase ? plan.phase.charAt(0).toUpperCase() + plan.phase.slice(1) + " phase" : "Aerobic base"} · 2026
            </span>
          </div>

          {/* two-column grid on desktop */}
          <div className="dash-columns">

            {/* ---- LEFT COLUMN ---- */}
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
                    ? <span><span style={{ color: TIER.long }}>Down week</span> · {remaining} km to planned target</span>
                    : <span>{remaining} km remaining · {pct}% complete</span>
                  }
                </div>
                <div style={S.barTrack}>
                  <div style={{ ...S.barFill, width: `${pct}%`, background: isDownWeek ? TIER.long : YELLOW }} />
                </div>
                <div style={S.readyPill}>
                  <span style={{ ...S.readyDot, background: rd.dot }} />
                  <span style={S.readyLabel}>{rd.label}</span>
                  {readiness?.restHrDelta != null
                    ? <span style={S.readyDelta}>RHR {readiness.restHrDelta >= 0 ? "+" : ""}{readiness.restHrDelta} bpm</span>
                    : <span style={S.readyDelta}>Health feed pending</span>
                  }
                </div>
              </div>

              {/* week strip */}
              <div className="dash-strip" style={S.strip}>
                {weekStrip.map(x => (
                  <div key={x.d} style={S.stripCol}>
                    <div style={{
                      ...S.stripDot,
                      background: x.done ? TIER[x.type] : "transparent",
                      border: x.done ? "none" : `1.5px solid ${x.today ? YELLOW : "#2A2A27"}`,
                    }} />
                    <span style={{ ...S.stripDay, color: x.today ? YELLOW : "#7A7A72" }}>{x.d}</span>
                    {x.done && x.km > 0 && <span style={S.stripKm}>{x.km.toFixed(0)}km</span>}
                  </div>
                ))}
              </div>

              {/* week focus */}
              {plan?.weekFocus && (
                <div style={S.focusBanner}>
                  <span style={S.focusLabel}>WEEK FOCUS</span>
                  <p style={S.focusText}>{plan.weekFocus}</p>
                </div>
              )}

              {/* today */}
              <div style={S.sectionLabel}>TODAY · {todayKey.toUpperCase()}</div>
              <div style={{ ...S.card, borderColor: "#1E1E1B" }}>
                <div style={S.cardHead}>
                  <span style={{ ...S.typeTag, background: TIER[session.type] || TIER.easy, color: "#111" }}>
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
                {session.rationale && (
                  <div style={S.why}>
                    <span style={S.whyLabel}>WHY THIS SESSION</span>
                    <p style={S.whyText}>{session.rationale}</p>
                  </div>
                )}
              </div>

              {/* athlete conditioning notes */}
              <AthleteNotes latestNote={liveData?.latestNote} />
            </div>

            {/* ---- RIGHT COLUMN ---- */}
            <div>
              {/* upcoming */}
              {upcoming.length > 0 && (
                <>
                  <div style={S.sectionLabel}>COMING UP</div>
                  {upcoming.map((u, i) => (
                    <div key={i} style={S.card}>
                      <div style={S.upHead}>
                        <span style={{ ...S.typeDot, background: TIER[u.type] || TIER.easy }} />
                        <span style={S.upDay}>{u.dayLabel}</span>
                        {u.weekLabel && <span style={{ fontSize: 10, color: YELLOW, opacity: 0.7, marginLeft: 6, fontWeight: 600 }}>{u.weekLabel}</span>}
                        {u.recommendedDay && <span style={S.upFocus}>{u.recommendedDay}</span>}
                      </div>
                      <div style={S.upTitle}>{u.title}</div>
                      {(u.detail || []).slice(0, 2).map((d, j) => (
                        <div key={j} style={S.bulletRow}>
                          <span style={S.bullet}>▸</span>
                          <span style={S.bulletText}>{d}</span>
                        </div>
                      ))}
                      {u.rationale && <p style={S.upRationale}>{u.rationale}</p>}
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
                        <div style={S.progressNum}>{progress.currentEquivalent}</div>
                        <div style={S.progressLabel}>Current equivalent</div>
                      </div>
                      <div style={S.progressDivider} />
                      <div style={S.progressStat}>
                        <div style={{ ...S.progressNum, color: progress.onTrack ? TIER.threshold : TIER.long }}>
                          {progress.onTrack ? "On track" : "Off track"}
                        </div>
                        <div style={S.progressLabel}>vs sub-2:30 target</div>
                      </div>
                    </div>
                    {plan?.progressNote && <p style={S.whyText}>{plan.progressNote}</p>}
                    {progress.keyLever && (
                      <div style={S.keyLever}>
                        <span style={S.whyLabel}>KEY LEVER</span>
                        <p style={{ ...S.whyText, color: YELLOW, opacity: 0.9 }}>{progress.keyLever}</p>
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
                  typeColour={TIER[a.type] || TIER.easy}
                  fmtDist={fmtDist}
                  fmtTime={fmtTime}
                  fmtPace={fmtPace}
                  recentFeedback={liveData?.recentFeedback}
                />
              ))}
            </div>
          </div>

          {/* ---- FULL WIDTH BELOW COLUMNS ---- */}
          <div className="dash-fullwidth">

            {/* volume chart */}
            <div style={S.sectionLabel}>VOLUME · LAST 8 WEEKS</div>
            <div style={S.card}>
              <VolumeChart series={series} />
              <div style={S.legendRow}>
                <span style={S.legendItem}><span style={{ ...S.legendSwatch, background: YELLOW }} /> Build week</span>
                <span style={S.legendItem}><span style={{ ...S.legendSwatch, background: TIER.long }} /> Down week</span>
                <span style={S.legendItem}><span style={{ ...S.legendSwatch, background: "rgba(255,255,0,0.25)", border: "1px dashed rgba(255,255,0,0.4)" }} /> Target</span>
              </div>
            </div>

            {/* health cards */}
            <div style={S.sectionLabel}>HEALTH · TODAY</div>
            <HealthCards
              metrics={{
                resting_hr: readiness?.restingHr,
                sleep_score: readiness?.sleepScore,
                sleep_duration_min: readiness?.sleepDuration,
                steps: readiness?.steps,
                respiratory_rate: readiness?.respiratoryRate,
                weight_kg: liveData?.body?.weight_kg || null,
              }}
              hrBaseline={readiness?.hrBaseline}
            />

            {/* body composition */}
            <BodyCard body={liveData?.body} />

            {/* activity calendar */}
            <div style={{ ...S.sectionLabel, marginTop: 20 }}>ACTIVITY · LAST 12 WEEKS</div>
            <div style={{ ...S.card, paddingLeft: 28 }}>
              <ActivityCalendar calendarData={calendarData} streak={liveData?.streak} weekMinutes={liveData?.weekMinutes} />
            </div>

            {/* goal */}
            <div style={S.sectionLabel}>GOAL</div>
            <div style={S.card}>
              <div style={S.raceNum}>Sub 2:30</div>
              <div style={S.cardDetail}>Target window · late 2027</div>
              <p style={S.whyText}>No fixed date yet. The plan locks to a precise countdown once you choose a race.</p>
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

function VolumeChart({ series }) {
  if (!series?.actual?.length) return null;
  const W = 320, H = 160, padL = 32, padR = 20, padT = 12, padB = 24;
  const chartW = W - padL - padR, chartH = H - padT - padB;
  const actuals = series.actual.filter(v => v != null && v > 0);
  const maxVal = Math.max(...(series.target || []), ...actuals, 20) * 1.15;
  const n = series.weeks.length;
  const xPos = i => padL + (i / (n - 1)) * chartW;
  const yPos = v => padT + chartH * (1 - v / maxVal);
  const gridVals = [];
  const step = maxVal > 100 ? 40 : 20;
  for (let v = 0; v <= maxVal; v += step) gridVals.push(v);
  const points = series.weeks.map((_, i) => ({ x: xPos(i), y: series.actual[i] != null ? yPos(series.actual[i]) : null, act: series.actual[i], isDown: series.down?.[i], wk: series.weeks[i] }));
  const lineParts = [];
  let seg = [];
  for (const p of points) {
    if (p.act != null && p.act > 0) { seg.push(p); }
    else { if (seg.length) lineParts.push(seg); seg = []; }
  }
  if (seg.length) lineParts.push(seg);
  const pathD = s => s.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const tgtY = series.target?.[0] ? yPos(series.target[0]) : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} role="img" aria-label="Weekly running volume">
      {gridVals.map(v => (
        <g key={v}>
          <line x1={padL} y1={yPos(v)} x2={W - padR} y2={yPos(v)} stroke="#1E1E1C" strokeWidth="1" />
          <text x={padL - 4} y={yPos(v) + 3.5} textAnchor="end" fontSize="8" fill="#5A5A55" fontFamily="system-ui">{v}</text>
        </g>
      ))}
      {tgtY && <line x1={padL} y1={tgtY} x2={W - padR} y2={tgtY} stroke="#FFFF00" strokeWidth="1" strokeDasharray="4 3" opacity="0.25" />}
      {lineParts.map((s, si) => s.length > 1 && (
        <path key={si} d={[...s.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`), `L ${s[s.length-1].x} ${padT+chartH}`, `L ${s[0].x} ${padT+chartH}`, "Z"].join(" ")} fill="rgba(255,255,0,0.04)" />
      ))}
      {lineParts.map((s, si) => <path key={si} d={pathD(s)} fill="none" stroke={YELLOW} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />)}
      {points.map((p, i) => p.act != null && p.act > 0 ? <circle key={i} cx={p.x} cy={p.y} r="3" fill={p.isDown ? TIER.long : YELLOW} stroke="#070707" strokeWidth="1.5" /> : null)}
      {points.map((p, i) => <text key={i} x={p.x} y={H - 6} textAnchor="middle" fontSize="8" fill="#5A5A55" fontFamily="system-ui">{p.wk}</text>)}
    </svg>
  );
}

const S = {
  pageWrap: { minHeight: "100vh", background: "#030303", display: "flex", alignItems: "flex-start", justifyContent: "center" },
  root: { position: "relative", width: "100%", maxWidth: 420, margin: "0 auto", minHeight: "100vh", background: "#070707", fontFamily: "system-ui, -apple-system, sans-serif", color: "#fff", overflow: "hidden" },
  glowWide: { position: "absolute", left: "50%", top: "20%", transform: "translate(-50%,-50%)", width: "120%", height: 500, background: "radial-gradient(ellipse, rgba(255,255,0,0.18) 0%, rgba(255,221,0,0.06) 40%, rgba(0,0,0,0) 70%)", filter: "blur(24px)", pointerEvents: "none", transition: "opacity 0.15s linear", zIndex: 0, display: "none" },
  glow: { position: "absolute", left: "50%", top: "55%", transform: "translate(-50%,-50%)", width: 460, height: 460, background: "radial-gradient(circle, rgba(255,255,0,0.40) 0%, rgba(255,221,0,0.14) 38%, rgba(0,0,0,0) 70%)", filter: "blur(18px)", pointerEvents: "none", transition: "opacity 0.15s linear", zIndex: 0 },
  glowTop: { position: "absolute", left: "8%", top: "4%", width: 220, height: 220, background: "radial-gradient(circle, rgba(255,255,0,0.16) 0%, rgba(0,0,0,0) 70%)", filter: "blur(14px)", pointerEvents: "none", transition: "opacity 0.15s linear", zIndex: 0 },
  scroll: { position: "relative", zIndex: 1, height: "100%", overflowY: "auto", padding: "20px 18px 0", boxSizing: "border-box" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 },
  brand: { fontWeight: 800, fontSize: 18, letterSpacing: 2, color: "#fff" },
  phasePill: { fontSize: 12, color: "#9A9A92", background: "#121210", padding: "5px 11px", borderRadius: 12 },
  heroWrap: { marginBottom: 22 },
  eyebrow: { fontSize: 12, letterSpacing: 1.6, color: "#8A8A82", marginBottom: 6 },
  heroRow: { display: "flex", alignItems: "baseline", gap: 10 },
  heroNum: { fontSize: 84, fontWeight: 800, lineHeight: 0.9, letterSpacing: -3, color: "#fff" },
  heroUnit: { fontSize: 26, fontWeight: 700, color: YELLOW },
  heroSub: { fontSize: 14, color: "#A8A8A0", marginTop: 10 },
  barTrack: { height: 6, background: "#1C1C1A", borderRadius: 3, marginTop: 14, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3, transition: "width 0.4s ease" },
  readyPill: { display: "inline-flex", alignItems: "center", gap: 9, marginTop: 16, padding: "8px 13px", background: "#101006", border: "1px solid rgba(255,255,0,0.35)", borderRadius: 16 },
  readyDot: { width: 9, height: 9, borderRadius: "50%" },
  readyLabel: { fontSize: 14, fontWeight: 500 },
  readyDelta: { fontSize: 12, color: "#8A8A82", marginLeft: 4 },
  strip: { display: "flex", justifyContent: "space-between", margin: "8px 0 20px" },
  stripCol: { display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flex: 1 },
  stripDot: { width: 14, height: 14, borderRadius: "50%" },
  stripDay: { fontSize: 11, fontWeight: 500 },
  stripKm: { fontSize: 10, color: "#6A6A63" },
  focusBanner: { background: "#0D0D0A", border: "1px solid #1E1E14", borderRadius: 12, padding: "12px 14px", marginBottom: 16 },
  focusLabel: { fontSize: 10, letterSpacing: 1.4, color: YELLOW, opacity: 0.7 },
  focusText: { fontSize: 13, color: "#B0B0A8", margin: "6px 0 0", lineHeight: 1.5 },
  sectionLabel: { fontSize: 12, letterSpacing: 1.6, color: "#8A8A82", margin: "8px 2px 12px" },
  card: { background: "#0C0C0B", border: "1px solid #161614", borderRadius: 16, padding: "16px 18px", marginBottom: 14, textAlign: "left" },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  typeTag: { fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8, letterSpacing: 0.5 },
  cardTitle: { fontSize: 22, fontWeight: 700, marginBottom: 10, textAlign: "left" },
  bulletRow: { display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  bullet: { color: YELLOW, fontSize: 11, marginTop: 3, flexShrink: 0, opacity: 0.85 },
  bulletText: { fontSize: 14, color: "#C2C2BA", lineHeight: 1.45, flex: 1, textAlign: "left" },
  why: { marginTop: 14, paddingTop: 14, borderTop: "1px solid #161614" },
  whyLabel: { fontSize: 11, letterSpacing: 1.4, color: YELLOW, opacity: 0.85 },
  whyText: { fontSize: 14, lineHeight: 1.55, color: "#9E9E96", margin: "8px 0 0" },
  upHead: { display: "flex", alignItems: "center", gap: 9, marginBottom: 8 },
  typeDot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  upDay: { fontSize: 13, fontWeight: 600 },
  upFocus: { fontSize: 12, color: "#7A7A72", marginLeft: "auto" },
  upTitle: { fontSize: 17, fontWeight: 600, marginBottom: 6 },
  upDetail: { fontSize: 13, color: "#C2C2BA", marginBottom: 3 },
  upRationale: { fontSize: 13, lineHeight: 1.5, color: "#8E8E86", margin: "8px 0 0" },
  progressRow: { display: "flex", alignItems: "center", gap: 16, marginBottom: 14 },
  progressStat: { flex: 1, textAlign: "center" },
  progressNum: { fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: -0.5 },
  progressLabel: { fontSize: 11, color: "#6A6A63", marginTop: 4 },
  progressDivider: { width: 1, height: 40, background: "#1E1E1C" },
  keyLever: { marginTop: 14, paddingTop: 14, borderTop: "1px solid #161614" },
  actHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  actName: { fontSize: 14, fontWeight: 600, flex: 1 },
  actDate: { fontSize: 11, color: "#6A6A63" },
  actStats: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  actStat: { fontSize: 13, color: "#C2C2BA" },
  actStatSep: { fontSize: 11, color: "#444" },
  legendRow: { display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" },
  legendItem: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "#8A8A82" },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
  raceNum: { fontSize: 38, fontWeight: 800, color: "#fff", marginBottom: 8 },
  footer: { textAlign: "center", fontSize: 11, color: "#4A4A45", padding: "20px 0 28px" },
};