// BACKGROUND PLAYBACK — web equivalent of Android MediaStyle notifications.
//
// A plain Next.js web app cannot host a native Android Media3 /
// MediaSession / Foreground Service — those are Android SDK components
// that only exist inside an installed Android app. What the *browser*
// gives a web page instead is the Media Session API: it puts the track's
// title/artist/artwork and play/pause/next/previous controls on the
// lock screen and in the notification shade on Android Chrome, and in
// the OS media widget on desktop — which is the closest web-native
// analogue, especially once ANON-Tune is "installed" as a PWA (see
// public/manifest.json). If ANON-Tune is later wrapped as a Trusted Web
// Activity / Capacitor shell for the Play Store, that shell can use real
// Media3 on top of this same player.

export function isMediaSessionSupported() {
  return typeof navigator !== "undefined" && "mediaSession" in navigator;
}

export function updateMediaSessionMetadata(track) {
  if (!isMediaSessionSupported() || !track) return;
  try {
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: track.title || "ANON-Tune",
      artist: track.channel || "",
      album: "ANON-Tune",
      artwork: track.thumbnail
        ? [
            { src: track.thumbnail, sizes: "320x180", type: "image/jpeg" },
            { src: track.thumbnail, sizes: "640x360", type: "image/jpeg" },
          ]
        : [],
    });
  } catch {
    // MediaMetadata not available — ignore, controls still work without artwork
  }
}

export function setMediaSessionPlaybackState(state) {
  if (!isMediaSessionSupported()) return;
  navigator.mediaSession.playbackState = state; // "playing" | "paused" | "none"
}

export function registerMediaSessionHandlers({ onPlay, onPause, onNext, onPrevious, onSeek }) {
  if (!isMediaSessionSupported()) return;
  const set = (action, handler) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler || null);
    } catch {
      // Some browsers don't support every action — ignore unsupported ones
    }
  };
  set("play", onPlay);
  set("pause", onPause);
  set("nexttrack", onNext);
  set("previoustrack", onPrevious);
  if (onSeek) {
    set("seekto", (details) => onSeek(details.seekTime));
  }
}
