// ── SONG INTELLIGENCE ENGINE ────────────────────────────────────────────
//
// A-tune / ANON-Tune has no access to a licensed audio-analysis API (no
// Spotify-style audio features, no waveform access — only what YouTube's
// search results expose: title, channel, duration, thumbnail). So this
// module builds a *text + metadata derived* feature vector instead of a
// true acoustic one, then treats it exactly like the spec's feature
// vector: normalized 0–1 dimensions, a phase/mood/atmosphere hint, and a
// combined embedding used for cosine similarity. It's a heuristic stand
// in for real audio features — swap `extractFeatures` for a call to a
// real audio-features provider later and everything downstream (vibe,
// phase, transition, embeddings) keeps working unchanged.

const GENRE_KEYWORDS = {
  "lo-fi": ["lofi", "lo-fi", "lo fi", "chillhop", "beats to study"],
  "hip-hop": ["hip hop", "hip-hop", "rap", "trap", "drill", "phonk"],
  edm: ["edm", "electro", "house", "techno", "dubstep", "trance", "dnb", "drum and bass", "festival mix"],
  pop: ["pop", "chart", "top 40"],
  rock: ["rock", "punk", "grunge", "alt rock", "alternative"],
  metal: ["metal", "metalcore", "death metal", "hardcore"],
  indie: ["indie", "bedroom pop", "dream pop"],
  classical: ["classical", "orchestra", "symphony", "piano sonata", "concerto"],
  jazz: ["jazz", "swing", "bebop", "saxophone"],
  rnb: ["r&b", "rnb", "soul", "neo soul"],
  country: ["country", "bluegrass", "honky tonk"],
  folk: ["folk", "acoustic session", "singer-songwriter"],
  reggae: ["reggae", "dancehall", "ska"],
  devotional: ["bhajan", "devotional", "carnatic", "kirtan", "hymn"],
  kpop: ["k-pop", "kpop"],
  instrumental: ["instrumental", "no vocals", "background music", "score", "soundtrack", "bgm"],
  ambient: ["ambient", "soundscape", "drone", "meditation music"],
};

const MOOD_KEYWORDS = {
  happy: ["happy", "feel good", "feelgood", "joy", "sunshine", "good vibes", "upbeat"],
  sad: ["sad", "heartbreak", "breakup", "broken", "lonely", "tears", "goodbye", "crying"],
  romantic: ["love", "romantic", "valentine", "crush", "in love"],
  energetic: ["energetic", "hype", "pump up", "anthem", "banger", "power"],
  chill: ["chill", "relax", "calm", "mellow", "laid back", "easy listening"],
  angry: ["angry", "rage", "furious", "aggressive"],
  nostalgic: ["nostalgia", "nostalgic", "throwback", "90s", "2000s", "retro", "old school"],
  dreamy: ["dreamy", "ethereal", "atmospheric", "floating", "hazy"],
  motivational: ["motivation", "motivational", "inspire", "inspiring", "grind", "hustle"],
  dark: ["dark", "moody", "eerie", "haunting"],
};

const ATMOSPHERE_KEYWORDS = {
  "Night Drive Phase": ["night drive", "drive", "highway", "midnight drive"],
  "Workout Phase": ["workout", "gym", "cardio", "training", "run mix"],
  "Romantic Phase": ["romantic", "love song", "slow dance", "valentine"],
  "Sad Phase": ["sad songs", "heartbreak", "breakup", "crying"],
  "Focus Phase": ["study", "focus", "concentration", "deep work", "productivity"],
  "Nostalgic Phase": ["throwback", "nostalgia", "retro", "old school", "90s", "2000s"],
  "Party Phase": ["party", "club", "dance mix", "rave"],
  "Dreamy Phase": ["dreamy", "ethereal", "ambient", "atmospheric"],
  "Late Night Phase": ["late night", "midnight", "2am", "insomnia"],
  "Travel Phase": ["road trip", "travel", "journey", "adventure"],
  "Relaxation Phase": ["relax", "spa", "calm down", "unwind", "sleep music"],
  "Emotional Phase": ["emotional", "feels", "deep lyrics"],
  "Motivational Phase": ["motivation", "workout motivation", "success", "grind"],
  "Chill Phase": ["chill", "lofi", "relaxing beats"],
};

const LANGUAGE_SCRIPTS = [
  { language: "Tamil", re: /[\u0B80-\u0BFF]/ },
  { language: "Hindi", re: /[\u0900-\u097F]/ },
  { language: "Telugu", re: /[\u0C00-\u0C7F]/ },
  { language: "Kannada", re: /[\u0C80-\u0CFF]/ },
  { language: "Malayalam", re: /[\u0D00-\u0D7F]/ },
  { language: "Japanese", re: /[\u3040-\u30FF\u4E00-\u9FFF]/ },
  { language: "Korean", re: /[\uAC00-\uD7AF]/ },
];
const LANGUAGE_KEYWORDS = {
  Tamil: ["tamil"],
  Hindi: ["hindi", "bollywood"],
  Telugu: ["telugu", "tollywood"],
  Malayalam: ["malayalam", "mollywood"],
  Kannada: ["kannada", "sandalwood"],
  Korean: ["korean", "k-pop", "kpop"],
  Japanese: ["japanese", "anime"],
  Spanish: ["spanish", "latino", "reggaeton"],
  English: ["english"],
};

const STOPWORDS = new Set([
  "the","a","an","of","and","or","to","in","on","for","with","feat","ft","official","video",
  "audio","lyrics","lyric","music","song","full","hd","4k","new","latest","mv","live","remix",
  "cover","version","edit","original","from","by","vs","x","prod","out","now","topic",
]);

function toSeconds(durationText) {
  if (!durationText) return null;
  const parts = durationText.split(":").map((p) => parseInt(p, 10));
  if (parts.some((p) => Number.isNaN(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

function scoreKeywordHit(text, dict) {
  const scores = {};
  for (const [label, words] of Object.entries(dict)) {
    let hits = 0;
    for (const w of words) if (text.includes(w)) hits++;
    if (hits > 0) scores[label] = hits;
  }
  return scores;
}

function topLabel(scores, fallback) {
  const entries = Object.entries(scores);
  if (entries.length === 0) return fallback;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

function detectLanguage(title, channel) {
  const combined = `${title} ${channel}`;
  for (const { language, re } of LANGUAGE_SCRIPTS) {
    if (re.test(combined)) return language;
  }
  const lower = combined.toLowerCase();
  for (const [language, words] of Object.entries(LANGUAGE_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) return language;
  }
  return "Unknown";
}

function detectEra(title) {
  const m = title.match(/\b(19[5-9]\d|20[0-2]\d|2030)\b/);
  if (m) {
    const year = parseInt(m[1], 10);
    const decade = Math.floor(year / 10) * 10;
    return `${decade}s`;
  }
  const lower = title.toLowerCase();
  if (/(90s|nineties)/.test(lower)) return "1990s";
  if (/(2000s|y2k)/.test(lower)) return "2000s";
  if (/(2010s)/.test(lower)) return "2010s";
  if (/retro|throwback|old school/.test(lower)) return "Retro";
  return "Current";
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0080-\uffff\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

// Deterministic string hash → bucket index, so the same word always maps
// to the same embedding dimension.
function hashToken(token, mod) {
  let h = 0;
  for (let i = 0; i < token.length; i++) {
    h = (h * 31 + token.charCodeAt(i)) >>> 0;
  }
  return h % mod;
}

const EMBED_TEXT_DIMS = 40; // hashed bag-of-words dimensions
const EMBED_NUMERIC_DIMS = 8; // audio-style numeric dimensions
export const EMBED_DIMS = EMBED_TEXT_DIMS + EMBED_NUMERIC_DIMS;

/**
 * Builds a multidimensional music profile for a track using only its
 * metadata (title/channel/duration). Mirrors the spec's feature vector
 * (energy, valence, danceability, acousticness, instrumentalness,
 * emotional_intensity, tempo estimate, plus genre/mood/atmosphere/
 * language/era/vocal categorical fields) and a combined embedding for
 * cosine similarity.
 */
export function extractFeatures(track) {
  const title = (track.title || "").toLowerCase();
  const channel = (track.channel || "").toLowerCase();
  const combined = `${title} ${channel}`;

  const genreScores = scoreKeywordHit(combined, GENRE_KEYWORDS);
  const moodScores = scoreKeywordHit(combined, MOOD_KEYWORDS);
  const atmosphereScores = scoreKeywordHit(combined, ATMOSPHERE_KEYWORDS);

  const genre = topLabel(genreScores, "unspecified");
  const mood = topLabel(moodScores, "neutral");
  const phaseHint = topLabel(atmosphereScores, null);
  const language = detectLanguage(track.title || "", track.channel || "");
  const era = detectEra(track.title || "");

  const instrumental = /instrumental|no vocals|bgm|score|soundtrack/.test(combined);
  const acoustic = /acoustic|unplugged|piano cover|guitar cover|live session/.test(combined);
  const slowed = /slowed|8d audio|reverb|sped up/.test(combined);

  // Heuristic numeric dimensions, each in [0,1].
  const energyHigh = /edm|party|dance|workout|gym|hype|anthem|banger|trap|phonk|rave|pump/.test(combined);
  const energyLow = /lofi|lo-fi|chill|calm|relax|sleep|ambient|acoustic|piano|soft|slow|mellow|study/.test(combined);
  let energy = 0.5;
  if (energyHigh) energy += 0.3;
  if (energyLow) energy -= 0.25;
  if (mood === "energetic") energy += 0.15;
  if (mood === "chill") energy -= 0.15;
  energy = clamp01(energy);

  let valence = 0.5;
  if (mood === "happy") valence += 0.3;
  if (mood === "sad" || mood === "dark") valence -= 0.3;
  if (mood === "romantic") valence += 0.1;
  if (mood === "angry") valence -= 0.15;
  valence = clamp01(valence);

  let danceability = 0.5;
  if (genre === "edm" || genre === "pop" || phaseHint === "Party Phase") danceability += 0.3;
  if (genre === "classical" || genre === "ambient" || acoustic) danceability -= 0.3;
  danceability = clamp01(danceability);

  let acousticness = acoustic ? 0.85 : genre === "classical" || genre === "folk" || genre === "jazz" ? 0.6 : 0.2;
  acousticness = clamp01(acousticness);

  let instrumentalness = instrumental ? 0.9 : genre === "classical" || genre === "ambient" ? 0.5 : 0.05;
  instrumentalness = clamp01(instrumentalness);

  let emotionalIntensity = 0.5;
  if (mood === "sad" || mood === "emotional" || phaseHint === "Emotional Phase" || phaseHint === "Sad Phase") emotionalIntensity += 0.3;
  if (mood === "romantic") emotionalIntensity += 0.15;
  if (mood === "chill" || genre === "lo-fi") emotionalIntensity -= 0.1;
  emotionalIntensity = clamp01(emotionalIntensity);

  // Tempo is estimated only for relative transition comparisons — never
  // shown to the user as a real BPM reading.
  let tempoEst = 100;
  if (energy > 0.7) tempoEst = 130 + energy * 30;
  else if (energy < 0.35) tempoEst = 65 + energy * 40;
  else tempoEst = 95 + energy * 40;
  if (slowed) tempoEst *= 0.8;
  const tempoNorm = clamp01((tempoEst - 60) / (180 - 60));

  const durationSec = toSeconds(track.duration) || 210;
  const durationNorm = clamp01(durationSec / 420);

  const numeric = [
    energy,
    valence,
    danceability,
    acousticness,
    instrumentalness,
    emotionalIntensity,
    tempoNorm,
    durationNorm,
  ];

  // Bag-of-words text signal, seeded with the categorical labels so genre/
  // mood/phase/language pull real weight in the embedding too.
  const tokens = tokenize(`${track.title || ""} ${track.channel || ""}`);
  const seeded = [...tokens, genre, mood, language, phaseHint || "", era].filter(Boolean);
  const textVec = new Array(EMBED_TEXT_DIMS).fill(0);
  for (const tok of seeded) {
    textVec[hashToken(tok, EMBED_TEXT_DIMS)] += 1;
  }
  const textMax = Math.max(1, ...textVec);
  for (let i = 0; i < textVec.length; i++) textVec[i] = textVec[i] / textMax;

  const embedding = [...numeric, ...textVec];

  return {
    videoId: track.videoId,
    title: track.title,
    channel: track.channel,
    thumbnail: track.thumbnail,
    duration: track.duration,
    genre,
    mood,
    phaseHint, // may be null — not every title signals an atmosphere
    language,
    era,
    vocalStyle: instrumental ? "instrumental" : "vocal",
    energy,
    valence,
    danceability,
    acousticness,
    instrumentalness,
    emotionalIntensity,
    tempoEst,
    durationSec,
    embedding,
  };
}

export function cosineSimilarity(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Similarity across just the "vibe" dimensions (mood/energy/valence/etc.),
// distinct from the full embedding — this is what §2 "Same-Vibe Detection"
// is computed from, so two differently-genred songs can still score high.
export function vibeSimilarity(a, b) {
  const dims = ["energy", "valence", "danceability", "acousticness", "emotionalIntensity"];
  let sumSq = 0;
  for (const d of dims) sumSq += (a[d] - b[d]) ** 2;
  const dist = Math.sqrt(sumSq / dims.length);
  return clamp01(1 - dist);
}

// How naturally `b` would follow `a` playing right now (§10 Transition
// Intelligence): tempo/energy/mood/atmosphere compatibility.
export function transitionScore(a, b) {
  const tempoDelta = Math.abs(a.tempoEst - b.tempoEst) / 60; // ~0..1+
  const tempoScore = clamp01(1 - tempoDelta);
  const energyScore = clamp01(1 - Math.abs(a.energy - b.energy));
  const moodScore = a.mood === b.mood ? 1 : 0.4;
  const atmosphereScore = a.phaseHint && a.phaseHint === b.phaseHint ? 1 : 0.5;
  const vocalScore = a.vocalStyle === b.vocalStyle ? 1 : 0.6;
  return clamp01(
    tempoScore * 0.3 + energyScore * 0.3 + moodScore * 0.2 + atmosphereScore * 0.1 + vocalScore * 0.1
  );
}

export { GENRE_KEYWORDS, MOOD_KEYWORDS, ATMOSPHERE_KEYWORDS };
