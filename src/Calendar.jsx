// ActivityCalendar.jsx — drop-in component for the Sub230 dashboard
// Shows last 12 weeks as a grid. Each day is a small circle:
//   - Single activity type: solid colour
//   - Multiple types: pie-sliced circle in each type's colour
//   - Rest day: empty dark circle
// Streak counter sits above the grid.

import React from "react";

const TIER = {
  easy:      "#FAE24A",  // yellow
  long:      "#EC9649",  // orange
  threshold: "#2DD4BF",  // teal
  intervals: "#19E785",  // green
  strength:  "#9D90FF",  // purple
  swim:      "#59CEF1",  // blue
  cycling:   "#F472B6",  // pink
  other:     "#5A5A55",
  rest:      "#1C1C1A",
};

// SVG pie-slice circle for multi-type days
function ActivityCircle({ types, size = 12 }) {
  if (!types || types.length === 0) {
    return (
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 1}
        fill={TIER.rest} />
    );
  }

  // deduplicate types preserving order
  const unique = [...new Set(types)];

  if (unique.length === 1) {
    return (
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 0.5}
        fill={TIER[unique[0]] || TIER.other} />
    );
  }

  // pie slices
  const r = size / 2 - 0.5;
  const cx = size / 2;
  const cy = size / 2;
  const sliceAngle = (2 * Math.PI) / unique.length;
  const slices = unique.map((type, i) => {
    const startAngle = i * sliceAngle - Math.PI / 2;
    const endAngle = startAngle + sliceAngle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return <path key={type} d={d} fill={TIER[type] || TIER.other} />;
  });

  return <>{slices}</>;
}

export function ActivityCalendar({ calendarData, streak, weekMinutes }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // helper: get YYYY-MM-DD in local time (not UTC)
  const localDateStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const todayStr = localDateStr(today);

  // start from Monday 12 weeks ago (Mon=0 in our system)
  const start = new Date(today);
  const dayOfWeek = (today.getDay() + 6) % 7; // Mon=0
  start.setDate(today.getDate() - dayOfWeek - 11 * 7);

  const weeks = [];
  const cursor = new Date(start);

  for (let w = 0; w < 12; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = localDateStr(cursor);
      const acts = calendarData?.[dateStr] || [];
      const types = [...new Set(acts.map(a => a.type))];
      const isFuture = cursor > today;
      week.push({ dateStr, types, isFuture, isToday: dateStr === todayStr });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const CELL = 16;
  const GAP = 3;

  return (
    <div style={CS.wrap}>
      {/* streak and minutes */}
      <div style={CS.streakRow}>
        <div style={CS.streakBlock}>
          <span style={CS.streakNum}>{streak ?? 0}</span>
          <span style={CS.streakLabel}>week streak</span>
        </div>
        <div style={CS.streakDivider} />
        <div style={CS.streakBlock}>
          <span style={CS.streakNum}>{weekMinutes ?? 0}</span>
          <span style={CS.streakLabel}>mins this week</span>
        </div>
      </div>

      {/* day labels */}
      <div style={CS.dayLabels}>
        {dayLabels.map((l, i) => (
          <span key={i} style={CS.dayLabel}>{l}</span>
        ))}
      </div>

      {/* grid: weeks as columns, days as rows */}
      <div style={{ display: "flex", gap: GAP }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
            {week.map((day, di) => (
              <svg
                key={di}
                width={CELL}
                height={CELL}
                viewBox={`0 0 ${CELL} ${CELL}`}
                style={{
                  opacity: day.isFuture ? 0.15 : 1,
                  outline: day.isToday ? "1.5px solid #FFFF00" : "none",
                  borderRadius: "50%",
                }}
              >
                {day.types.length === 0 ? (
                  <circle cx={CELL/2} cy={CELL/2} r={CELL/2 - 1} fill={TIER.rest} />
                ) : (
                  <ActivityCircle types={day.types} size={CELL} />
                )}
              </svg>
            ))}
          </div>
        ))}
      </div>

      {/* legend */}
      <div style={CS.legend}>
        {[
          { type: "easy",      label: "Run"       },
          { type: "long",      label: "Long"      },
          { type: "intervals", label: "Intervals" },
          { type: "strength",  label: "Gym"       },
          { type: "swim",      label: "Swim"      },
        ].map(({ type, label }) => (
          <span key={type} style={CS.legendItem}>
            <span style={{ ...CS.legendDot, background: TIER[type] }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

const CS = {
  wrap: {
    padding: "16px 18px 4px",
  },
  streakRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 14,
  },
  streakBlock: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
  },
  streakDivider: {
    width: 1,
    height: 24,
    background: "#1E1E1C",
  },
  streakNum: {
    fontSize: 32,
    fontWeight: 800,
    color: "#FFFF00",
    letterSpacing: -1,
  },
  streakLabel: {
    fontSize: 13,
    color: "#8A8A82",
  },
  dayLabels: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    position: "absolute",
    marginLeft: -14,
    marginTop: 0,
  },
  dayLabel: {
    fontSize: 8,
    color: "#5A5A55",
    width: 10,
    height: 16,
    display: "flex",
    alignItems: "center",
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px 14px",
    marginTop: 12,
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11,
    color: "#8A8A82",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
};