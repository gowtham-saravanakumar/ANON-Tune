import { extractFeatures, cosineSimilarity, vibeSimilarity, transitionScore } from "./features";
import { PHASES, detectPhase, timeOfDayGuess } from "./phases";
import { skipProbability, isRecentlyPlayed, isRecentlySkipped, recentRecommendationPenalty } from "./store";

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

// ── SESSION INTELLIGENCE (§4) ───────────────────────────────────────────
// Builds a rolling picture of "what the user wants right now" from the
// last handful of tracks in this tab's session (kept separately from the
// long-lived profile, which persists across sessions).
export function buildSessionSummary(sessionTracks) {
  if (!sessionTracks || sessionTracks.length === 0) {
    const hour = new Date().getHours();
    return {
      avg: { energy: 0.5, valence: 0.5, acousticness: 0.4, emotionalIntensity: 0.4 },
      phase: timeOfDayGuess(hour),
      confidence: 0.2,
      trackCount: 0,
    };
  }

  let wEnergy = 0, wValence = 0, wAcoustic = 0, wEmotion = 0, wSum = 0;
  for (const s of sessionTracks) {
    // replayed/liked/fully played tracks count more; skipped ones count
    // less (they tell us what the user does NOT want right now).
    let w = 1;
    if (s.event === "replay") w = 2.2;
    else if (s.event === "like") w = 2;
    else if (s.event === "full_play") w = 1.4;
    else if (s.event === "skip_quick") w = -0.6;
    else if (s.event === "skip_partial") w = -0.2;
    const f = s.features;
    wEnergy += f.energy * w;
    wValence += f.valence * w;
    wAcoustic += f.acousticness * w;
    wEmotion += f.emotionalIntensity * w;
    wSum += w;
  }
  const norm = wSum === 0 ? 1 : wSum;
  const avg = {
    energy: clamp01(wEnergy / norm),
    valence: clamp01(wValence / norm),
    acousticness: clamp01(wAcoustic / norm),
    emotionalIntensity: clamp01(wEmotion / norm),
  };
  const hour = new Date().getHours();
  const { phase, confidence } = detectPhase(avg, hour);
  return { avg, phase, confidence, trackCount: sessionTracks.length };
}

function affinityFor(map, key) {
  if (!key) return 0;
  return map[key] ?? 0;
}

// ── PERSONALIZED RECOMMENDATION SCORE (§6) ──────────────────────────────
export function scoreCandidate(candidate, { currentTrack, session, profile, hour }) {
  const w = profile.weights;

  const vibeSim = currentTrack ? vibeSimilarity(candidate, currentTrack) : 0.5;
  const contentSim = currentTrack ? cosineSimilarity(candidate.embedding, currentTrack.embedding) : 0.4;

  const phaseSim =
    session.phase && candidate.phaseHint
      ? candidate.phaseHint === session.phase
        ? 1
        : 0.35
      : 0.55;

  const userPref = clamp01(
    0.5 +
      0.5 *
        (0.4 * affinityFor(profile.artistAffinity, candidate.channel) +
          0.3 * affinityFor(profile.genreAffinity, candidate.genre) +
          0.15 * affinityFor(profile.moodAffinity, candidate.mood) +
          0.15 * affinityFor(profile.languageAffinity, candidate.language))
  );

  const sessionCompat = clamp01(
    1 -
      Math.sqrt(
        ((candidate.energy - session.avg.energy) ** 2 +
          (candidate.valence - session.avg.valence) ** 2 +
          (candidate.acousticness - session.avg.acousticness) ** 2) /
          3
      )
  );

  const timeGuess = timeOfDayGuess(hour);
  const context = candidate.phaseHint === timeGuess ? 1 : 0.5;

  const skipPenalty = skipProbability(profile, candidate) * 0.35;
  const repetitionPenalty = recentRecommendationPenalty(profile, candidate.videoId);

  const rawScore =
    w.vibe * vibeSim +
    w.content * contentSim +
    w.phase * phaseSim +
    w.userPref * userPref +
    w.session * sessionCompat +
    w.context * context -
    skipPenalty -
    repetitionPenalty;

  const transition = currentTrack ? transitionScore(currentTrack, candidate) : 0.5;

  return {
    score: clamp01(rawScore),
    transition,
    breakdown: { vibeSim, contentSim, phaseSim, userPref, sessionCompat, context, skipPenalty, repetitionPenalty },
  };
}

// ── EXPLAINABLE RECOMMENDATIONS (§15) ───────────────────────────────────
export function explain(candidate, currentTrack, session, breakdown) {
  const reasons = [];
  if (breakdown.vibeSim > 0.75) reasons.push("Same vibe as what's playing");
  if (currentTrack && candidate.mood === currentTrack.mood) reasons.push(`Same "${candidate.mood}" mood`);
  if (candidate.phaseHint && candidate.phaseHint === session.phase) reasons.push(`Fits your ${session.phase.replace(" Phase", "")} phase`);
  if (currentTrack && candidate.genre === currentTrack.genre && candidate.genre !== "unspecified") reasons.push(`Similar ${candidate.genre} sound`);
  if (breakdown.userPref > 0.65) reasons.push("You tend to enjoy this artist/genre");
  if (currentTrack && Math.abs(candidate.tempoEst - currentTrack.tempoEst) < 12) reasons.push("Similar tempo");
  if (reasons.length === 0) reasons.push("Introduces something a little new");
  return reasons.slice(0, 4);
}

// ── CANDIDATE GENERATION, Stage 1 (§12) ─────────────────────────────────
// Since there's no static catalog, candidates are pulled live from
// YouTube search using queries built from the current track + session +
// top affinities. This is the "retrieval" stage of the pipeline.
export function buildCandidateQueries({ currentTrack, session, profile }) {
  const queries = new Set();

  if (currentTrack) {
    if (currentTrack.channel) queries.add(currentTrack.channel);
    queries.add(`songs like ${currentTrack.title}`.slice(0, 80));
    if (currentTrack.genre !== "unspecified") queries.add(`${currentTrack.genre} mix`);
    if (currentTrack.mood !== "neutral") queries.add(`${currentTrack.mood} songs`);
  }

  if (session.phase) {
    queries.add(session.phase.replace(" Phase", " music"));
  }

  const topArtist = Object.entries(profile.artistAffinity).sort((a, b) => b[1] - a[1])[0];
  if (topArtist && topArtist[1] > 0.3) queries.add(topArtist[0]);

  const topGenre = Object.entries(profile.genreAffinity).sort((a, b) => b[1] - a[1])[0];
  if (topGenre && topGenre[1] > 0.3) queries.add(`${topGenre[0]} songs`);

  if (queries.size === 0) queries.add("popular songs right now");

  return Array.from(queries).slice(0, 5);
}

// ── FULL PIPELINE, Stages 2–5 (§12) + DIVERSITY (§9) + DISCOVERY (§8) ──
export function rankAndBucket(rawCandidates, { currentTrack, session, profile }) {
  const hour = new Date().getHours();
  const seen = new Set();
  const scored = [];

  for (const raw of rawCandidates) {
    if (!raw.videoId || seen.has(raw.videoId)) continue;
    seen.add(raw.videoId);
    if (currentTrack && raw.videoId === currentTrack.videoId) continue;
    if (isRecentlyPlayed(profile, raw.videoId)) continue;
    if (isRecentlySkipped(profile, raw.videoId)) continue;
    if (profile.dislikedIds.includes(raw.videoId)) continue;

    const features = extractFeatures(raw);
    const { score, transition, breakdown } = scoreCandidate(features, { currentTrack, session, profile, hour });
    scored.push({
      ...features,
      score,
      transition,
      breakdown,
      reasons: explain(features, currentTrack, session, breakdown),
    });
  }

  scored.sort((a, b) => b.score - a.score);

  // Diversity engine: cap how many times one artist/channel can appear
  // in the ranked list before later occurrences get pushed down.
  const artistCount = {};
  for (const c of scored) {
    artistCount[c.channel] = (artistCount[c.channel] || 0) + 1;
    if (artistCount[c.channel] > 2) c.score *= 0.6;
    if (artistCount[c.channel] > 4) c.score *= 0.5;
  }
  scored.sort((a, b) => b.score - a.score);

  const sameVibe = [];
  const samePhase = [];
  const discovery = [];
  const exploration = [];

  for (const c of scored) {
    if (c.breakdown.vibeSim >= 0.72) sameVibe.push(c);
    else if (c.breakdown.vibeSim >= 0.5) discovery.push(c);
    else exploration.push(c);

    if (session.phase && c.phaseHint === session.phase) samePhase.push(c);
  }

  return {
    sameVibe: sameVibe.slice(0, 8),
    samePhase: samePhase.slice(0, 8),
    discovery: discovery.slice(0, 6),
    exploration: exploration.slice(0, 4),
    ranked: scored,
  };
}

// Builds the actual autoplay order: ~70% safe / 20% discovery / 10%
// exploration (§8), ordered within itself by transition score so
// playback feels continuous rather than random (§10).
export function buildSmartQueue(buckets, length = 10) {
  const safeCount = Math.round(length * 0.7);
  const discoveryCount = Math.round(length * 0.2);
  const explorationCount = Math.max(1, length - safeCount - discoveryCount);

  const pick = (arr, n) =>
    [...arr].sort((a, b) => b.transition - a.transition).slice(0, n);

  const queue = [
    ...pick(buckets.sameVibe, safeCount),
    ...pick(buckets.discovery, discoveryCount),
    ...pick(buckets.exploration, explorationCount),
  ];

  // Interleave so it doesn't play "all safe, then all weird" — spread
  // discovery/exploration picks through the queue instead of clumping.
  const safe = queue.filter((_, i) => i < safeCount);
  const rest = queue.filter((_, i) => i >= safeCount);
  const interleaved = [];
  let ri = 0;
  safe.forEach((track, i) => {
    interleaved.push(track);
    if ((i + 1) % 3 === 0 && ri < rest.length) interleaved.push(rest[ri++]);
  });
  while (ri < rest.length) interleaved.push(rest[ri++]);

  const seen = new Set();
  return interleaved.filter((t) => (seen.has(t.videoId) ? false : (seen.add(t.videoId), true)));
}

export { PHASES };
