// ── USER BEHAVIOR MODEL (§5) + ANTI-REPETITION MEMORY (§16) ────────────
// ── CONTINUOUS LEARNING (§14) ───────────────────────────────────────────
//
// Everything here lives in localStorage — there's no account system and
// no server database, so "the user's taste" is scoped to this browser.
// That's intentional: A-tune/ANON-Tune is a personal, individual
// recommendation system, not a synced multi-device one.

const KEY = "anon-tune:profile:v1";

const SIGNAL_WEIGHTS = {
  replay: 0.4, // very strong positive
  full_play: 0.3, // strong positive
  like: 0.4, // very strong positive
  playlist_add: 0.35, // very strong positive
  queue_add: 0.3, // strong positive intent
  search: 0.12, // positive intent
  recommend_click: 0.2, // positive
  unlike: -0.3,
  playlist_remove: -0.2,
  skip_quick: -0.3, // strong negative (<15s or <20% played)
  skip_partial: -0.15, // moderate negative
  recommend_skip: -0.08,
};

function emptyProfile() {
  return {
    version: 1,
    createdAt: Date.now(),
    onboarded: false,
    artistAffinity: {}, // channel -> [-1,1]
    genreAffinity: {},
    moodAffinity: {},
    languageAffinity: {},
    likedIds: [],
    dislikedIds: [],
    history: [], // [{videoId,title,channel,at,event}]
    recentlyPlayed: [], // [{videoId, at}]
    recentlyRecommended: [], // [{videoId, at}]
    recentlySkipped: [], // [{videoId, at}]
    playCounts: {}, // videoId -> n
    skipStats: {}, // channel -> {plays, skips}
    weights: {
      vibe: 0.25,
      content: 0.2,
      phase: 0.2,
      userPref: 0.15,
      session: 0.1,
      context: 0.05,
      discovery: 0.05,
    },
  };
}

export function loadProfile() {
  if (typeof window === "undefined") return emptyProfile();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyProfile();
    const parsed = JSON.parse(raw);
    return { ...emptyProfile(), ...parsed };
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(profile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // storage full or unavailable — fail silently, app still works in-memory
  }
}

function clamp(n, lo = -1, hi = 1) {
  return Math.max(lo, Math.min(hi, n));
}

// Incremental (exponential-moving-average) preference update — pulls the
// affinity toward +1/-1 by an amount proportional to signal strength, so
// a "replay" moves the needle a lot more than a quiet "search". This is
// the §14 "incremental preference update" rather than a full retrain.
function bump(map, key, delta) {
  if (!key) return;
  const cur = map[key] ?? 0;
  const alpha = clamp(Math.abs(delta) * 1.2, 0, 0.6);
  const target = Math.sign(delta);
  map[key] = clamp(cur + alpha * (target - cur), -1, 1);
}

const MAX_RING = 60;
function pushRing(arr, item, max = MAX_RING) {
  arr.push(item);
  if (arr.length > max) arr.shift();
  return arr;
}

/**
 * Records a listening/behavior event and returns the updated profile.
 * `track` is a feature-extracted track (see engine/features.js).
 * `eventType` is one of the SIGNAL_WEIGHTS keys.
 * `meta` can carry { completion } for play/skip classification upstream.
 */
export function recordEvent(profile, track, eventType) {
  const weight = SIGNAL_WEIGHTS[eventType] ?? 0;
  const p = { ...profile };
  p.artistAffinity = { ...p.artistAffinity };
  p.genreAffinity = { ...p.genreAffinity };
  p.moodAffinity = { ...p.moodAffinity };
  p.languageAffinity = { ...p.languageAffinity };

  bump(p.artistAffinity, track.channel, weight);
  bump(p.genreAffinity, track.genre, weight);
  bump(p.moodAffinity, track.mood, weight);
  bump(p.languageAffinity, track.language, weight);

  p.history = pushRing([...p.history], {
    videoId: track.videoId,
    title: track.title,
    channel: track.channel,
    event: eventType,
    at: Date.now(),
  });

  p.playCounts = { ...p.playCounts };
  if (eventType === "full_play" || eventType === "replay") {
    p.playCounts[track.videoId] = (p.playCounts[track.videoId] || 0) + 1;
    p.recentlyPlayed = pushRing([...p.recentlyPlayed], { videoId: track.videoId, at: Date.now() }, 25);
  }
  if (eventType === "skip_quick" || eventType === "skip_partial") {
    p.recentlySkipped = pushRing([...p.recentlySkipped], { videoId: track.videoId, at: Date.now() }, 25);
  }
  if (eventType === "recommend_click" || eventType === "queue_add") {
    p.recentlyRecommended = pushRing([...p.recentlyRecommended], { videoId: track.videoId, at: Date.now() }, 40);
  }

  p.skipStats = { ...p.skipStats };
  const stat = p.skipStats[track.channel] || { plays: 0, skips: 0 };
  if (eventType === "full_play" || eventType === "replay") stat.plays += 1;
  if (eventType === "skip_quick") stat.skips += 1;
  p.skipStats[track.channel] = stat;

  if (eventType === "like" && !p.likedIds.includes(track.videoId)) {
    p.likedIds = [...p.likedIds, track.videoId];
    p.dislikedIds = p.dislikedIds.filter((id) => id !== track.videoId);
  }
  if (eventType === "unlike") {
    p.likedIds = p.likedIds.filter((id) => id !== track.videoId);
  }

  saveProfile(p);
  return p;
}

export function markOnboarded(profile, seedGenres = [], seedMoods = []) {
  const p = { ...profile, onboarded: true };
  p.genreAffinity = { ...p.genreAffinity };
  p.moodAffinity = { ...p.moodAffinity };
  for (const g of seedGenres) bump(p.genreAffinity, g, 0.5);
  for (const m of seedMoods) bump(p.moodAffinity, m, 0.5);
  saveProfile(p);
  return p;
}

export function skipProbability(profile, track) {
  const stat = profile.skipStats[track.channel];
  if (!stat || stat.plays + stat.skips < 2) return 0.15; // unknown → mild caution
  return clamp(stat.skips / (stat.plays + stat.skips), 0, 1);
}

export function isRecentlyPlayed(profile, videoId, windowMs = 3 * 60 * 60 * 1000) {
  const now = Date.now();
  return profile.recentlyPlayed.some((e) => e.videoId === videoId && now - e.at < windowMs);
}

export function isRecentlySkipped(profile, videoId, windowMs = 45 * 60 * 1000) {
  const now = Date.now();
  return profile.recentlySkipped.some((e) => e.videoId === videoId && now - e.at < windowMs);
}

export function recentRecommendationPenalty(profile, videoId) {
  const now = Date.now();
  const hit = profile.recentlyRecommended.find((e) => e.videoId === videoId);
  if (!hit) return 0;
  const ageMs = now - hit.at;
  const decayWindow = 2 * 60 * 60 * 1000;
  return Math.max(0, 0.25 * (1 - ageMs / decayWindow));
}

export { SIGNAL_WEIGHTS };
