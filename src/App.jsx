import React, { useState, useEffect } from "react";
import { ActivityCalendar } from "./Calendar.jsx";
import { HealthCards } from "./HealthCards.jsx";
import { FitnessCards } from "./FitnessCards.jsx";
import { ActivityFeedbackCard } from "./ActivityFeedbackCard.jsx";
import { AthleteNotes } from "./AthleteNotes.jsx";
import { BodyCard } from "./BodyCard.jsx";
import { BACKEND, ACTIVITY_COLOURS, WEEKLY_TARGET_KM } from "./config.js";

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

const WEEK_SCHEDULE = [
  { d: "Mon", label: "Gym: legs",       type: "strength"  },
  { d: "Tue", label: "Commute + track", type: "intervals" },
  { d: "Wed", label: "Commute",         type: "easy"      },
  { d: "Thu", label: "Treadmill reps",  type: "intervals" },
  { d: "Fri", label: "Commute",         type: "easy"      },
  { d: "Sat", label: "Long run",        type: "long"      },
  { d: "Sun", label: "Easy or swim",    type: "easy"      },
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

const DAY_TO_PLAN = {
  Mon: "monday", Tue: "tuesday", Wed: "wednesday",
  Thu: "thursday", Fri: "friday", Sat: "saturday", Sun: "sunday",
};

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
function safeStr(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") return val;
  if (typeof val === "object") return val.summary ? String(val.summary) : null;
  return String(val);
}

const TABS = [
  { id: "today",    glyph: "05:45", label: "Today"    },
  { id: "plan",     glyph: "WK",    label: "Plan"     },
  { id: "progress", glyph: "2:30",  label: "Progress" },
];

export default function Dashboard() {
  const [liveData, setLiveData]         = useState(null);
  const [calendarData, setCalendarData] = useState(null);
  const [plan, setPlan]                 = useState(null);
  const [nextWeekPlan, setNextWeekPlan] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [activeTab, setActiveTab]       = useState("today");

  useEffect(() => {
    const fromHash = () => {
      const h = location.hash.replace("#", "");
      if (TABS.find(t => t.id === h)) setActiveTab(h);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const switchTab = (id) => {
    setActiveTab(id);
    history.pushState(null, "", `#${id}`);
    window.scrollTo(0, 0);
  };

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
    <div style={S.loadWrap}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: "var(--accent)", fontFamily: "var(--disp)", marginBottom: 12, letterSpacing: 2 }}>
          SUB<span style={{ color: "var(--ink-hi)" }}>2:30</span>
        </div>
        <div style={{ color: "var(--ink-low)", fontSize: 13, fontFamily: "var(--mono)", letterSpacing: "0.1em" }}>LOADING YOUR PLAN</div>
      </div>
    </div>
  );

  if (error) return (
    <div style={S.loadWrap}>
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

  const statusObj    = liveData?.status;
  const legacyState  = readiness?.state || "ready";
  const statusWord   = statusObj?.word || { ready: "Ready", steady: "Caution", hold: "Hold" }[legacyState] || "Ready";
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
  const todayNum  = new Date().getDay();
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
  const syncTime = new Date(liveData.lastSync).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={S.pageWrap}>
      <header style={S.header}>
        <span style={S.brand}>SUB<span style={{ color: "var(--accent)" }}>2:30</span></span>
        <span style={S.phasePill}>
          {plan?.phase ? plan.phase.charAt(0).toUpperCase() + plan.phase.slice(1) : "Base"} · 2026
        </span>
        <span style={S.syncBadge}>● {syncTime}</span>
      </header>

      <main style={S.main}>

        {activeTab === "today" && (
          <div style={S.view}>
            <div style={S.gantry}>
              {[
                { label: "LOAD", word: statusWord, colour: statusColour, detail: statusDetail },
                {
                  label: "RECOVERY",
                  word: readiness?.sleepDuration ? `${Math.round(readiness.sleepDuration / 60 * 10) / 10}h` : "Pending",
                  colour: readiness?.sleepDuration
                    ? readiness.sleepDuration >= 420 ? "var(--pos)" : readiness.sleepDuration >= 330 ? "var(--warn)" : "var(--alert)"
                    : "var(--ink-low)",
                  detail: readiness?.sleepDuration ? "sleep last night" : "awaiting health data",
                },
                {
                  label: "HAMSTRING",
                  word: liveData?.status?.word === "Caution" && liveData?.status?.detail?.includes("Injury") ? "Caution" : "Ready",
                  colour: liveData?.status?.word === "Caution" && liveData?.status?.detail?.includes("Injury") ? "var(--warn)" : "var(--pos)",
                  detail: liveData?.status?.detail?.includes("Injury") ? "flagged in journal" : "no flags",
                },
              ].map(seg => (
                <div key={seg.label} style={{ ...S.seg, borderTopColor: seg.colour, background: `linear-gradient(180deg, ${seg.colour}12 0%, var(--ground-1) 60%)` }}>
                  <div style={S.segLabel}>{seg.label}</div>
                  <div style={{ ...S.segWord, color: seg.colour }}>{seg.word}</div>
                  <div style={S.segDetail}>{seg.detail}</div>
                </div>
              ))}
            </div>

            <div style={S.sectionLabel}>TODAY · {todayKey.toUpperCase()}</div>
            <div style={{ ...S.card, ...S.railCard, "--rail": ACTIVITY_COLOURS[session.type] || ACTIVITY_COLOURS.easy }}>
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
                <details style={S.details}>
                  <summary style={S.detailsSummary}>
                    <span style={S.whyLabel}>WHY</span>
                    <span style={S.whySummary}>{session.summary || "Session rationale"}</span>
                    <svg style={S.detailsChev} width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.6"/>
                    </svg>
                  </summary>
                  <p style={{ ...S.whyText, paddingBottom: 4 }}>{session.rationale}</p>
                </details>
              )}
            </div>

            <AthleteNotes latestNote={liveData?.latestNote} />

            {(() => {
              const tomorrowKeys = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
              const tmKey = tomorrowKeys[todayNum === 6 ? 0 : todayNum];
              const tmSession = plan?.sessions?.[tmKey];
              if (!tmSession) return null;
              const tmLabel = tmKey.charAt(0).toUpperCase() + tmKey.slice(1);
              return (
                <>
                  <div style={S.sectionLabel}>TOMORROW · {tmLabel.toUpperCase()}</div>
                  <div style={{ ...S.card, ...S.railCard, "--rail": ACTIVITY_COLOURS[tmSession.type] || ACTIVITY_COLOURS.easy, opacity: 0.8 }}>
                    <div style={S.upHead}>
                      <span style={{ ...S.typeDot, background: ACTIVITY_COLOURS[tmSession.type] || ACTIVITY_COLOURS.easy }} />
                      <span style={S.upDay}>{tmLabel}</span>
                    </div>
                    <div style={S.upTitle}>{tmSession.title}</div>
                    {tmSession.summary && <p style={S.upSummary}>{tmSession.summary}</p>}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {activeTab === "plan" && (
          <div style={S.view}>
            <div style={S.card}>
              <div style={S.eyebrow}>THIS WEEK</div>
              <div style={S.heroRow}>
                <span style={S.heroNum}>{completed.toFixed(1)}</span>
                <span style={S.heroUnit}>/ {target} km</span>
              </div>
              <div style={S.heroSub}>
                {isDownWeek
                  ? <span><span style={{ color: "var(--warn)" }}>Down week</span> · {remaining} km to target</span>
                  : <span>{remaining} km remaining · {pct}%</span>
                }
              </div>
              <div style={S.barTrack}>
                <div style={{ ...S.barFill, width: `${pct}%`, background: isDownWeek ? "var(--warn)" : "var(--accent)" }} />
              </div>
              <div style={{ ...S.strip, marginTop: 16 }}>
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
            </div>

            {plan?.weekFocus && (
              <div style={S.focusBanner}>
                <span style={S.focusLabel}>WEEK FOCUS</span>
                <p style={S.focusText}>{focusSummary(plan.weekFocus)}</p>
                {focusBody(plan.weekFocus) && (
                  <p style={{ ...S.focusText, marginTop: 6, color: "var(--ink-low)" }}>{focusBody(plan.weekFocus)}</p>
                )}
              </div>
            )}

            {upcoming.length > 0 && (
              <>
                <div style={S.sectionLabel}>COMING UP</div>
                {upcoming.map((u, i) => (
                  <div key={i} style={{ ...S.card, ...S.railCard, "--rail": ACTIVITY_COLOURS[u.type] || ACTIVITY_COLOURS.easy }}>
                    <div style={S.upHead}>
                      <span style={{ ...S.typeDot, background: ACTIVITY_COLOURS[u.type] || ACTIVITY_COLOURS.easy }} />
                      <span style={S.upDay}>{u.dayLabel}</span>
                      {u.weekLabel && <span style={{ fontSize: 10, color: "var(--accent)", opacity: 0.7, marginLeft: 6 }}>{u.weekLabel}</span>}
                    </div>
                    <div style={S.upTitle}>{u.title}</div>
                    {u.summary && <p style={S.upSummary}>{u.summary}</p>}
                    {(u.detail || []).slice(0, 2).map((d, j) => (
                      <div key={j} style={S.bulletRow}>
                        <span style={S.bullet}>▸</span>
                        <span style={S.bulletText}>{d}</span>
                      </div>
                    ))}
                    {u.rationale && (
                      <details style={S.details}>
                        <summary style={S.detailsSummary}>
                          <span style={S.whyLabel}>WHY</span>
                          <span style={S.whySummary}>{u.summary || "Session rationale"}</span>
                          <svg style={S.detailsChev} width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.6"/>
                          </svg>
                        </summary>
                        <p style={{ ...S.whyText, paddingBottom: 4 }}>{u.rationale}</p>
                      </details>
                    )}
                  </div>
                ))}
              </>
            )}

            <div style={S.sectionLabel}>VOLUME · LAST 8 WEEKS</div>
            <div style={S.card}>
              <VolumeChart series={series} />
              <div style={S.legendRow}>
                <span style={S.legendItem}><span style={{ ...S.legendSwatch, background: "var(--run)" }} /> Build week</span>
                <span style={S.legendItem}><span style={{ ...S.legendSwatch, background: "var(--warn)" }} /> Down week</span>
                <span style={S.legendItem}><span style={{ ...S.legendSwatch, background: "rgba(245,185,21,0.2)", border: "1px dashed rgba(245,185,21,0.4)" }} /> Target</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "progress" && (
          <div style={S.view}>
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
                        {progress.onTrack ? "On track" : "Caution"}
                      </div>
                      <div style={S.progressLabel}>vs sub-2:30 target</div>
                    </div>
                  </div>
                  {safeStr(plan?.progressNote) && <p style={S.whyText}>{safeStr(plan.progressNote)}</p>}
                  {progress.keyLever && (
                    <details style={S.details}>
                      <summary style={S.detailsSummary}>
                        <span style={S.whyLabel}>KEY LEVER</span>
                        <span style={{ ...S.whySummary, color: "var(--accent)" }}>{focusSummary(progress.keyLever)}</span>
                        <svg style={S.detailsChev} width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.6"/>
                        </svg>
                      </summary>
                      {focusBody(progress.keyLever) && (
                        <p style={{ ...S.whyText, paddingBottom: 4 }}>{focusBody(progress.keyLever)}</p>
                      )}
                    </details>
                  )}
                </div>
              </>
            )}

            <div style={S.sectionLabel}>FITNESS METRICS</div>
            <FitnessCards fitness={liveData?.fitness} />

            <div style={S.sectionLabel}>HEALTH · TODAY</div>
            <HealthCards
              metrics={{
                resting_hr:         readiness?.restingHr,
                sleep_score:        readiness?.sleepScore,
                sleep_duration_min: readiness?.sleepDuration,
                steps:              readiness?.steps,
                respiratory_rate:   readiness?.respiratoryRate,
              }}
              hrBaseline={readiness?.hrBaseline}
              body={liveData?.body}
            />

            <BodyCard body={liveData?.body} />

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
          </div>
        )}

      </main>

      <nav style={S.tabBar}>
        {TABS.map(t => (
          <button
            key={t.id}
            style={{ ...S.tab, color: activeTab === t.id ? "var(--accent)" : "var(--ink-low)" }}
            onClick={() => switchTab(t.id)}
            aria-current={activeTab === t.id ? "page" : undefined}
          >
            <span style={{ ...S.tabGlyph, fontFamily: "var(--disp)", fontWeight: 700, fontSize: 16 }}>{t.glyph}</span>
            <span style={S.tabLabel}>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

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
          <rect key={i} x={xLeft(i)} y={yPos(val)} width={barW} height={barH} rx="3"
            fill={isDown ? "var(--warn)" : "var(--run)"} opacity="0.85" />
        );
      })}
      {series.weeks.map((wk, i) => (
        <text key={i} x={xLeft(i) + barW / 2} y={H - 6} textAnchor="middle" fontSize="7.5"
          fill="var(--ink-low)" fontFamily="var(--mono)">{wk}</text>
      ))}
    </svg>
  );
}

const HEADER_H = 52;
const TAB_H    = 58;

const S = {
  pageWrap: { minHeight: "100dvh", background: "var(--ground-0)", color: "var(--ink-hi)", fontFamily: "var(--body)" },
  loadWrap: { minHeight: "100dvh", background: "var(--ground-0)", display: "flex", alignItems: "center", justifyContent: "center" },
  header: {
    position: "fixed", inset: "0 0 auto 0", zIndex: 30,
    paddingTop: "calc(10px + env(safe-area-inset-top))",
    paddingBottom: 10, paddingLeft: 18, paddingRight: 18,
    display: "flex", alignItems: "center", gap: 10,
    background: "rgba(11,10,8,0.82)",
    backdropFilter: "saturate(1.4) blur(14px)",
    WebkitBackdropFilter: "saturate(1.4) blur(14px)",
    borderBottom: "1px solid var(--line)",
  },
  brand: { fontFamily: "var(--disp)", fontWeight: 800, fontSize: 20, letterSpacing: ".04em", color: "var(--accent)" },
  phasePill: {
    fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase",
    color: "var(--ink-mid)", border: "1px solid var(--line)", borderRadius: 99, padding: "3px 9px",
  },
  syncBadge: { marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-low)", letterSpacing: ".08em" },
  main: {
    paddingTop: `calc(${HEADER_H}px + env(safe-area-inset-top) + 14px)`,
    paddingBottom: `calc(${TAB_H}px + env(safe-area-inset-bottom) + 20px)`,
    paddingLeft: 16, paddingRight: 16,
    maxWidth: 640, margin: "0 auto",
  },
  view: { animation: "fadeIn .22s ease" },
  tabBar: {
    position: "fixed", inset: "auto 0 0 0", zIndex: 30,
    display: "flex",
    paddingBottom: "env(safe-area-inset-bottom)",
    background: "rgba(11,10,8,0.88)",
    backdropFilter: "saturate(1.4) blur(14px)",
    WebkitBackdropFilter: "saturate(1.4) blur(14px)",
    borderTop: "1px solid var(--line)",
  },
  tab: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    padding: "9px 0 8px", background: "none", border: "none", cursor: "pointer",
    minHeight: 44, transition: "color .18s",
  },
  tabGlyph: { display: "block" },
  tabLabel: { fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".18em", textTransform: "uppercase" },
  gantry: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 },
  seg: {
    borderRadius: "var(--r-s)", padding: "10px 10px 12px",
    border: "1px solid var(--line)", borderTop: "3px solid",
    background: "var(--ground-1)",
  },
  segLabel: { fontFamily: "var(--mono)", fontSize: 8.5, letterSpacing: ".16em", color: "var(--ink-low)", textTransform: "uppercase" },
  segWord:  { fontFamily: "var(--disp)", fontWeight: 700, fontSize: 19, marginTop: 5, letterSpacing: ".02em" },
  segDetail:{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--ink-mid)", marginTop: 2 },
  card: { background: "var(--ground-1)", border: "1px solid var(--line)", borderRadius: "var(--r)", padding: "16px 18px", marginBottom: 10, textAlign: "left" },
  railCard: { paddingLeft: 22, borderLeft: "4px solid var(--rail, var(--run))", position: "relative" },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  typeTag: { fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500, padding: "4px 10px", borderRadius: "var(--r-s)", letterSpacing: ".14em", textTransform: "uppercase" },
  cardTitle: { fontSize: 19, fontWeight: 700, marginBottom: 10, color: "var(--ink-hi)", letterSpacing: "-.01em" },
  cardDetail: { fontSize: 13, color: "var(--ink-low)", fontFamily: "var(--mono)", marginBottom: 6 },
  bulletRow: { display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 5 },
  bullet: { color: "var(--accent)", fontSize: 10, marginTop: 4, flexShrink: 0, opacity: 0.8 },
  bulletText: { fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-mid)", lineHeight: 1.55, flex: 1, letterSpacing: ".02em" },
  details: { marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" },
  detailsSummary: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", listStyle: "none", minHeight: 36 },
  detailsChev: { flexShrink: 0, color: "var(--ink-low)", marginLeft: "auto" },
  whyLabel: { fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".2em", color: "var(--accent)", textTransform: "uppercase", flexShrink: 0 },
  whySummary: { fontSize: 13, color: "var(--ink-mid)", lineHeight: 1.4, flex: 1 },
  whyText: { fontSize: 13, lineHeight: 1.6, color: "var(--ink-low)", margin: "8px 0 0" },
  heroWrap: { marginBottom: 16 },
  eyebrow: { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".2em", color: "var(--ink-low)", marginBottom: 5, textTransform: "uppercase" },
  heroRow: { display: "flex", alignItems: "baseline", gap: 8 },
  heroNum: { fontSize: 72, fontWeight: 800, lineHeight: .92, letterSpacing: -2, color: "var(--ink-hi)", fontFamily: "var(--disp)" },
  heroUnit: { fontSize: 22, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--disp)" },
  heroSub: { fontSize: 12, color: "var(--ink-mid)", marginTop: 8, fontFamily: "var(--mono)" },
  barTrack: { height: 5, background: "var(--ground-2)", borderRadius: 3, marginTop: 12, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3, transition: "width .4s ease" },
  strip: { display: "flex", justifyContent: "space-between" },
  stripCol: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 },
  stripDot: { width: 22, height: 22, borderRadius: 7 },
  stripDay: { fontSize: 9.5, fontWeight: 500, fontFamily: "var(--mono)", letterSpacing: ".08em" },
  stripKm: { fontSize: 9, color: "var(--ink-low)", fontFamily: "var(--mono)" },
  focusBanner: { background: "var(--ground-1)", border: "1px solid var(--line)", borderRadius: "var(--r)", padding: "12px 14px", marginBottom: 10 },
  focusLabel: { fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".2em", color: "var(--accent)", textTransform: "uppercase" },
  focusText: { fontSize: 13, color: "var(--ink-mid)", margin: "5px 0 0", lineHeight: 1.55 },
  sectionLabel: { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".2em", color: "var(--ink-low)", textTransform: "uppercase", margin: "18px 2px 10px" },
  upHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
  typeDot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  upDay: { fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500, letterSpacing: ".1em", color: "var(--ink-mid)", textTransform: "uppercase" },
  upTitle: { fontSize: 16, fontWeight: 650, marginBottom: 5, color: "var(--ink-hi)" },
  upSummary: { fontSize: 13, color: "var(--ink-mid)", marginBottom: 7, lineHeight: 1.45 },
  progressRow: { display: "flex", alignItems: "center", gap: 16, marginBottom: 12 },
  progressStat: { flex: 1, textAlign: "center" },
  progressNum: { fontFamily: "var(--disp)", fontSize: 28, fontWeight: 800, color: "var(--ink-hi)" },
  progressLabel: { fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-low)", marginTop: 4, letterSpacing: ".1em" },
  progressDivider: { width: 1, height: 40, background: "var(--line)" },
  legendRow: { display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" },
  legendItem: { display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-low)", letterSpacing: ".08em" },
  legendSwatch: { width: 9, height: 9, borderRadius: 2, flexShrink: 0 },
  raceNum: { fontFamily: "var(--disp)", fontSize: 38, fontWeight: 800, color: "var(--ink-hi)", marginBottom: 8 },
};