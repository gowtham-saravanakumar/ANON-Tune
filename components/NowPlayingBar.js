import { useEffect, useRef, useState, useCallback } from "react";
import { PlayIcon, PauseIcon, NextIcon, PrevIcon, HeartIcon } from "./icons";
import {
  updateMediaSessionMetadata,
  setMediaSessionPlaybackState,
  registerMediaSessionHandlers,
} from "../lib/mediaSession";

function formatTime(sec) {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

let ytApiPromise = null;
function loadYouTubeAPI() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = resolve;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
  });
  return ytApiPromise;
}

/**
 * Audio-only player (no video shown, per requirement). The YouTube iframe
 * is kept alive off-screen instead of unmounted — unmounting/hiding it
 * with display:none tends to make mobile browsers suspend playback, which
 * would break background/lock-screen playback.
 */
export default function NowPlayingBar({ track, onEnded, onSkip, onTrackEvent, liked, onToggleLike, hasNext }) {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const seekingRef = useRef(false);
  const lastTrackRef = useRef(null);
  const maxCompletionRef = useRef(0);
  const playCountRef = useRef({});

  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const reportOutcome = useCallback(
    (prevTrack, endedNaturally) => {
      if (!prevTrack) return;
      const dur = playerRef.current?.getDuration?.() || duration || 1;
      const completion = Math.max(maxCompletionRef.current, current) / (dur || 1);
      let eventType;
      if (endedNaturally || completion > 0.85) {
        const count = (playCountRef.current[prevTrack.videoId] || 0) + 1;
        playCountRef.current[prevTrack.videoId] = count;
        eventType = count > 1 ? "replay" : "full_play";
      } else if (current < 15 || completion < 0.2) {
        eventType = "skip_quick";
      } else {
        eventType = "skip_partial";
      }
      onTrackEvent?.(prevTrack, eventType, completion);
    },
    [current, duration, onTrackEvent]
  );

  // Set up the YouTube IFrame player once.
  useEffect(() => {
    let cancelled = false;
    loadYouTubeAPI().then(() => {
      if (cancelled || !containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        height: "1",
        width: "1",
        playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1 },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.ENDED) {
              reportOutcome(lastTrackRef.current, true);
              onEnded?.();
            }
            if (e.data === window.YT.PlayerState.PLAYING) {
              setDuration(playerRef.current.getDuration());
              setIsPlaying(true);
              setMediaSessionPlaybackState("playing");
            }
            if (e.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              setMediaSessionPlaybackState("paused");
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
      playerRef.current?.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll current time.
  useEffect(() => {
    const id = setInterval(() => {
      if (playerRef.current?.getCurrentTime && isPlaying && !seekingRef.current) {
        const t = playerRef.current.getCurrentTime();
        setCurrent(t);
        maxCompletionRef.current = Math.max(maxCompletionRef.current, t);
      }
    }, 400);
    return () => clearInterval(id);
  }, [isPlaying]);

  // Load a new track when it changes.
  useEffect(() => {
    if (!ready || !track) return;
    if (lastTrackRef.current?.videoId === track.videoId) return;
    if (lastTrackRef.current) reportOutcome(lastTrackRef.current, false);

    playerRef.current.loadVideoById(track.videoId);
    playerRef.current.playVideo();
    lastTrackRef.current = track;
    maxCompletionRef.current = 0;
    setCurrent(0);
    setDuration(0);
    setIsPlaying(true);
    updateMediaSessionMetadata(track);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, ready]);

  function togglePlay() {
    if (!ready || !track) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }

  function seekTo(t) {
    playerRef.current?.seekTo(t, true);
    setCurrent(t);
    maxCompletionRef.current = Math.max(maxCompletionRef.current, t);
  }

  function skipForward() {
    if (lastTrackRef.current) reportOutcome(lastTrackRef.current, false);
    onSkip?.();
  }

  // Background playback controls (lock screen / notification / OS widget).
  useEffect(() => {
    registerMediaSessionHandlers({
      onPlay: () => playerRef.current?.playVideo?.(),
      onPause: () => playerRef.current?.pauseVideo?.(),
      onNext: hasNext ? skipForward : undefined,
      onSeek: (t) => seekTo(t),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNext, track]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
      {/* Off-screen audio-only YouTube player — never shown, kept mounted
          so background playback doesn't get interrupted by re-mounts. */}
      <div
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none", overflow: "hidden" }}
        aria-hidden="true"
      >
        <div ref={containerRef} />
      </div>

      <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-3">
        <div className="relative shrink-0 w-11 h-11 rounded-lg overflow-hidden bg-elevated border border-border">
          {track?.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{track ? track.title : "Search a song to start listening"}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted w-8">{formatTime(current)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={Math.min(current, duration || 0)}
              onChange={(e) => {
                seekingRef.current = true;
                setCurrent(Number(e.target.value));
              }}
              onMouseUp={(e) => {
                seekTo(Number(e.target.value));
                seekingRef.current = false;
              }}
              onTouchEnd={(e) => {
                seekTo(Number(e.target.value));
                seekingRef.current = false;
              }}
              disabled={!track}
              className="flex-1 h-1 accent-warm disabled:opacity-40"
            />
            <span className="text-[10px] text-muted w-8">{formatTime(duration)}</span>
          </div>
        </div>

        <button
          onClick={onToggleLike}
          disabled={!track}
          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition disabled:opacity-30 ${
            liked ? "text-danger" : "text-muted hover:text-ptext"
          }`}
        >
          <HeartIcon filled={liked} />
        </button>

        <button
          onClick={togglePlay}
          disabled={!track}
          className="shrink-0 w-10 h-10 rounded-full bg-warm text-white flex items-center justify-center disabled:opacity-30 hover:brightness-110 transition"
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        <button
          onClick={skipForward}
          disabled={!hasNext}
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-ptext disabled:opacity-30 transition"
          title="Next"
        >
          <NextIcon />
        </button>
      </div>
    </div>
  );
}
