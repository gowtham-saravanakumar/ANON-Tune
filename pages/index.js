import { useCallback, useEffect, useRef, useState } from "react";
import Head from "next/head";
import SearchBar from "../components/SearchBar";
import PhaseBadge from "../components/PhaseBadge";
import DiscoverPanel from "../components/DiscoverPanel";
import QueuePanel from "../components/QueuePanel";
import OnboardingChips from "../components/OnboardingChips";
import NowPlayingBar from "../components/NowPlayingBar";
import Credits from "../components/Credits";
import { QueueIcon, SparkleIcon } from "../components/icons";
import {
  extractFeatures,
  buildSessionSummary,
  buildCandidateQueries,
  rankAndBucket,
  buildSmartQueue,
  loadProfile,
  recordEvent,
  markOnboarded,
} from "../lib/engine";

const MAX_SESSION = 15;

async function searchYouTube(query) {
  try {
    const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState([]); // [{event, features}]
  const [currentTrack, setCurrentTrack] = useState(null); // feature-extracted
  const [manualQueue, setManualQueue] = useState([]); // raw tracks the user explicitly queued
  const [autoQueue, setAutoQueue] = useState([]); // smart-queue backlog from the engine
  const [buckets, setBuckets] = useState(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [tab, setTab] = useState("discover");

  const profileRef = useRef(null);
  const refreshSeq = useRef(0);

  useEffect(() => {
    const p = loadProfile();
    profileRef.current = p;
    setProfile(p);
    setHydrated(true);
  }, []);

  function updateProfile(next) {
    profileRef.current = next;
    setProfile(next);
  }

  const sessionSummary = buildSessionSummary(session);

  const refreshRecommendations = useCallback(
    async (currentTrackArg, sessionArg, profileArg) => {
      const mySeq = ++refreshSeq.current;
      setLoadingRecs(true);
      const summary = buildSessionSummary(sessionArg);
      const queries = buildCandidateQueries({ currentTrack: currentTrackArg, session: summary, profile: profileArg });
      const resultsLists = await Promise.all(queries.map(searchYouTube));
      if (mySeq !== refreshSeq.current) return;
      const merged = resultsLists.flat();
      const ranked = rankAndBucket(merged, { currentTrack: currentTrackArg, session: summary, profile: profileArg });
      setBuckets(ranked);
      setAutoQueue(buildSmartQueue(ranked, 10));
      setLoadingRecs(false);
    },
    []
  );

  // Rebuild recommendations whenever the current track or profile shifts.
  useEffect(() => {
    if (!hydrated || !profile) return;
    refreshRecommendations(currentTrack, session, profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, currentTrack?.videoId, profile]);

  function playTrack(rawTrack) {
    const features = extractFeatures(rawTrack);
    setCurrentTrack(features);
    setManualQueue((q) => q.filter((t) => t.videoId !== rawTrack.videoId));
    setAutoQueue((q) => q.filter((t) => t.videoId !== rawTrack.videoId));
  }

  function addToQueue(rawTrack) {
    setManualQueue((q) => (q.some((t) => t.videoId === rawTrack.videoId) ? q : [...q, rawTrack]));
    const features = extractFeatures(rawTrack);
    updateProfile(recordEvent(profileRef.current, features, "queue_add"));
  }

  function removeFromManualQueue(index) {
    setManualQueue((q) => q.filter((_, i) => i !== index));
  }

  function advanceQueue() {
    if (manualQueue.length > 0) {
      const [next, ...rest] = manualQueue;
      setManualQueue(rest);
      playTrack(next);
    } else if (autoQueue.length > 0) {
      const [next, ...rest] = autoQueue;
      setAutoQueue(rest);
      playTrack(next);
    }
  }

  function handleTrackEvent(prevFeatures, eventType) {
    const updated = recordEvent(profileRef.current, prevFeatures, eventType);
    updateProfile(updated);
    setSession((s) => {
      const next = [...s, { event: eventType, features: prevFeatures }];
      return next.length > MAX_SESSION ? next.slice(next.length - MAX_SESSION) : next;
    });
  }

  function toggleLike() {
    if (!currentTrack) return;
    const isLiked = profileRef.current.likedIds.includes(currentTrack.videoId);
    updateProfile(recordEvent(profileRef.current, currentTrack, isLiked ? "unlike" : "like"));
  }

  function handleSearchTerm(query) {
    const pseudo = extractFeatures({ videoId: `search:${query}`, title: query, channel: "" });
    updateProfile(recordEvent(profileRef.current, pseudo, "search"));
  }

  function handleOnboardingDone(genres, moods) {
    updateProfile(markOnboarded(profileRef.current, genres, moods));
  }

  const combinedQueue = [...manualQueue, ...autoQueue];
  const showOnboarding = hydrated && profile && !profile.onboarded && !currentTrack;

  return (
    <div className="min-h-screen bg-white text-ptext pb-28">
      <Head>
        <title>ANON-Tune — Music for your vibe</title>
        <meta
          name="description"
          content="ANON-Tune is a personal music discovery app that learns your vibe, mood, and listening phase to recommend what feels right to play next."
        />
      </Head>

      <header className="max-w-3xl mx-auto px-4 pt-8 pb-4">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ANON-Tune" className="w-11 h-11 rounded-xl" />
          <div>
            <h1 className="font-display text-xl font-bold leading-tight">ANON-Tune</h1>
            <p className="text-xs text-muted">Music for your vibe</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 space-y-6">
        <SearchBar onPlay={playTrack} onQueueAdd={addToQueue} onSearchTerm={handleSearchTerm} />

        {!showOnboarding && (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <PhaseBadge phase={sessionSummary.phase} confidence={sessionSummary.confidence} trackCount={sessionSummary.trackCount} />
            <div className="flex items-center gap-1 bg-elevated border border-border rounded-full p-1 text-xs">
              <button
                onClick={() => setTab("discover")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition ${
                  tab === "discover" ? "bg-white shadow-glow" : "text-muted"
                }`}
              >
                <SparkleIcon /> Discover
              </button>
              <button
                onClick={() => setTab("queue")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition ${
                  tab === "queue" ? "bg-white shadow-glow" : "text-muted"
                }`}
              >
                <QueueIcon /> Up next {combinedQueue.length > 0 ? `(${combinedQueue.length})` : ""}
              </button>
            </div>
          </div>
        )}

        {showOnboarding ? (
          <OnboardingChips onDone={handleOnboardingDone} />
        ) : tab === "discover" ? (
          <DiscoverPanel buckets={buckets} loading={loadingRecs} onPlay={playTrack} onQueueAdd={addToQueue} />
        ) : (
          <QueuePanel
            queue={combinedQueue}
            onPlayIndex={(i) => playTrack(combinedQueue[i])}
            onRemove={(i) => {
              if (i < manualQueue.length) removeFromManualQueue(i);
              else setAutoQueue((q) => q.filter((_, idx) => idx !== i - manualQueue.length));
            }}
          />
        )}

        <div className="pt-6">
          <Credits />
        </div>
      </main>

      <NowPlayingBar
        track={currentTrack}
        hasNext={combinedQueue.length > 0}
        onEnded={advanceQueue}
        onSkip={advanceQueue}
        onTrackEvent={handleTrackEvent}
        liked={!!(currentTrack && profile?.likedIds.includes(currentTrack.videoId))}
        onToggleLike={toggleLike}
      />
    </div>
  );
}
