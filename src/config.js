// Sub230 · client-side constants
// All hard-coded values that may need editing live here.

export const BACKEND = "https://sub230-backend.sub230.workers.dev";

export const STEP_TARGET        = 10000;
export const JOURNAL_PREVIEW_LEN = 90;   // characters shown before expand
export const WEEKLY_TARGET_KM   = 104;
export const DOWN_WEEK_THRESHOLD = 80;

// Activity colour tokens — must mirror var(--run/long/int/gym/swim) in tokens.css.
// Used in JS contexts where CSS variables cannot be read directly.
export const ACTIVITY_COLOURS = {
  easy:      "#E8D44D",
  long:      "#E8955E",
  threshold: "#5ECFA0",
  intervals: "#5ECFA0",
  strength:  "#9D8CF0",
  swim:      "#5EB8E8",
  cycling:   "#F472B6",
  rest:      "#2A261D",
};

// Status colour map — must mirror --pos/warn/alert in tokens.css.
export const STATUS_COLOURS = {
  Ready:   "#7ED17F",
  Caution: "#E8A04C",
  Hold:    "#E86A5E",
  Pending: "#7A745F",
};