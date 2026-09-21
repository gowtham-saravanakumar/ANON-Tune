// ── SAME-PHASE DETECTION (§3) ───────────────────────────────────────────
//
// A "phase" is the emotional/listening state around a group of songs. It
// is never permanently assigned — it's recomputed from the rolling
// listening session (recent plays, skips, replays, time of day) every
// time the queue is refreshed.

export const PHASES = {
  "Chill Phase": { energy: 0.3, valence: 0.6, acousticness: 0.5, emotionalIntensity: 0.35, hours: [13, 14, 15, 16, 17, 18, 19, 20] },
  "Night Drive Phase": { energy: 0.55, valence: 0.5, acousticness: 0.15, emotionalIntensity: 0.55, hours: [21, 22, 23, 0, 1] },
  "Romantic Phase": { energy: 0.4, valence: 0.7, acousticness: 0.4, emotionalIntensity: 0.6, hours: [19, 20, 21, 22] },
  "Sad Phase": { energy: 0.25, valence: 0.15, acousticness: 0.5, emotionalIntensity: 0.85, hours: [] },
  "Workout Phase": { energy: 0.9, valence: 0.65, acousticness: 0.05, emotionalIntensity: 0.5, hours: [6, 7, 8, 17, 18, 19] },
  "Focus Phase": { energy: 0.35, valence: 0.5, acousticness: 0.3, emotionalIntensity: 0.25, hours: [9, 10, 11, 12, 13, 14, 15, 16] },
  "Nostalgic Phase": { energy: 0.45, valence: 0.55, acousticness: 0.35, emotionalIntensity: 0.6, hours: [] },
  "Party Phase": { energy: 0.9, valence: 0.85, acousticness: 0.05, emotionalIntensity: 0.45, hours: [20, 21, 22, 23] },
  "Dreamy Phase": { energy: 0.3, valence: 0.55, acousticness: 0.35, emotionalIntensity: 0.55, hours: [22, 23, 0, 1, 2] },
  "Late Night Phase": { energy: 0.2, valence: 0.4, acousticness: 0.35, emotionalIntensity: 0.65, hours: [23, 0, 1, 2, 3] },
  "Travel Phase": { energy: 0.55, valence: 0.6, acousticness: 0.25, emotionalIntensity: 0.4, hours: [7, 8, 9, 15, 16, 17] },
  "Relaxation Phase": { energy: 0.2, valence: 0.55, acousticness: 0.6, emotionalIntensity: 0.3, hours: [20, 21, 22] },
  "Emotional Phase": { energy: 0.3, valence: 0.3, acousticness: 0.45, emotionalIntensity: 0.85, hours: [] },
  "Motivational Phase": { energy: 0.75, valence: 0.75, acousticness: 0.1, emotionalIntensity: 0.45, hours: [6, 7, 8] },
};

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

function hourWeight(proto, hour) {
  if (!proto.hours || proto.hours.length === 0) return 0.5; // hour-agnostic phase
  return proto.hours.includes(hour) ? 1 : 0.35;
}

/**
 * Picks the best-matching phase for an average session feature vector,
 * nudged by the current hour of day. Falls back to a time-of-day-only
 * guess when the session has no data yet (cold start).
 */
export function detectPhase(avgFeatures, hour) {
  const dims = ["energy", "valence", "acousticness", "emotionalIntensity"];
  let best = null;
  let bestScore = -Infinity;
  for (const [name, proto] of Object.entries(PHASES)) {
    let sumSq = 0;
    for (const d of dims) sumSq += (avgFeatures[d] - proto[d]) ** 2;
    const dist = Math.sqrt(sumSq / dims.length);
    const closeness = clamp01(1 - dist);
    const score = closeness * 0.75 + hourWeight(proto, hour) * 0.25;
    if (score > bestScore) {
      bestScore = score;
      best = name;
    }
  }
  return { phase: best, confidence: clamp01(bestScore) };
}

export function timeOfDayGuess(hour) {
  if (hour >= 23 || hour < 4) return "Late Night Phase";
  if (hour >= 4 && hour < 7) return "Relaxation Phase";
  if (hour >= 7 && hour < 10) return "Motivational Phase";
  if (hour >= 10 && hour < 17) return "Focus Phase";
  if (hour >= 17 && hour < 20) return "Chill Phase";
  return "Party Phase";
}
