# ANON-Tune

**Music for your vibe.**

ANON-Tune is a personal music discovery web app. Search a song, and it
figures out *why* you like it — vibe, mood, energy, phase — and builds a
queue of what would feel right to play next. No rooms, no accounts, no
social features: just you and your listening.

```
search → play → listen → smart queue → same vibe → same phase → discovery → continuous playback
```

## What's in here

- **Search** — live YouTube search (`pages/api/youtube-search.js`), no API
  key or quota, scraped the same way youtube.com's own page renders results.
- **Audio-only playback** — the YouTube player runs off-screen; no video is
  ever shown. `components/NowPlayingBar.js`.
- **The recommendation engine** — `lib/engine/`:
  - `features.js` — builds a multidimensional "song intelligence" profile
    (genre, mood, energy, valence, danceability, acousticness,
    instrumentalness, tempo estimate, language, era, atmosphere) from a
    track's title/channel/duration, plus a combined embedding for cosine
    similarity.
  - `phases.js` — the 14 music phases from the spec (Chill, Night Drive,
    Romantic, Sad, Workout, Focus, Nostalgic, Party, Dreamy, Late Night,
    Travel, Relaxation, Emotional, Motivational) and phase detection from
    the rolling session + time of day.
  - `store.js` — the persisted user behavior model (localStorage):
    artist/genre/mood/language affinity, likes, skip stats,
    recently-played/recommended/skipped anti-repetition memory, and
    incremental (EMA) learning after every interaction.
  - `recommend.js` — personalized scoring, the multi-stage candidate
    pipeline (retrieval → filter → rank → diversity → final selection),
    Same Vibe / Same Phase / Discovery / Exploration buckets (roughly
    70/20/10), transition scoring for smooth continuous playback, and
    explainable "recommended because…" reasons.
- **Background playback** — `lib/mediaSession.js` wires the browser's
  Media Session API so play/pause/next and track info show up on the
  Android/desktop lock screen and notification shade, and the audio
  keeps playing while you use another app or lock the screen (browser-
  dependent — see note below).
- **Pure white UI**, no background photo, `ANON-Tune` branding/icons.

## An honest note on "Android Media3 / Foreground Service"

Those are native Android SDK components — they only exist inside an
installed Android app, not a website. This is a Next.js **web app**
deployed to Vercel, so the closest real equivalent is the **Media
Session API** (used here) plus installing ANON-Tune as a PWA
(`public/manifest.json`), which gets you lock-screen controls and
background audio on Android Chrome in most cases. If you later want a
Play Store app with guaranteed native Media3 behavior, wrap this same
site in a Trusted Web Activity or Capacitor shell — that shell can use
real Media3 on top of the exact player already built here.

## An honest note on the "audio features"

There's no licensed audio-analysis API wired in (no Spotify-style audio
features, no waveform access) — only what YouTube search exposes: title,
channel, duration, thumbnail. So `features.js` derives energy, valence,
mood, genre, etc. from that metadata with keyword heuristics instead of
real acoustic analysis, and continuously refines its picture of *you*
from what you actually play, skip, replay, and like. It's a legitimate
stand-in, not real signal processing — swap `extractFeatures()` for a
real audio-features provider later and the rest of the pipeline (vibe,
phase, transitions, embeddings) keeps working unchanged.

## Running locally

```bash
npm install
npm run dev
```

No environment variables are required — search doesn't use an API key,
and there's no database (everything personal is in the browser's
localStorage).

## Deploying to Vercel

This is a plain Next.js app (no custom server, no socket connections),
so it deploys to Vercel with zero configuration:

```bash
npm i -g vercel
vercel
```

or just import the repo at vercel.com — framework preset "Next.js",
default build command (`next build`), default output. That's it.

---

Created by **Gowtham Saravanakumar**.
