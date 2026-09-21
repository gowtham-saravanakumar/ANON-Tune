import { PlayIcon } from "./icons";

function TrackCard({ track, onPlay, onQueueAdd }) {
  return (
    <div className="group shrink-0 w-40 bg-card border border-border rounded-2xl overflow-hidden hover:shadow-glow transition">
      <button onClick={() => onPlay(track)} className="relative block w-full aspect-video bg-elevated">
        {track.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition">
          <span className="opacity-0 group-hover:opacity-100 transition w-9 h-9 rounded-full bg-white text-ptext flex items-center justify-center">
            <PlayIcon />
          </span>
        </span>
      </button>
      <div className="p-2.5">
        <p className="text-xs font-medium leading-snug line-clamp-2 min-h-[2.2em]">{track.title}</p>
        <p className="text-[11px] text-muted truncate mt-0.5">{track.channel}</p>
        {track.reasons && (
          <p className="text-[10px] text-cool mt-1.5 line-clamp-1" title={track.reasons.join(" · ")}>
            {track.reasons[0]}
          </p>
        )}
        <button
          onClick={() => onQueueAdd(track)}
          className="mt-2 w-full text-[11px] border border-border rounded-lg py-1 hover:border-cool hover:text-cool transition"
        >
          + Queue
        </button>
      </div>
    </div>
  );
}

function Rail({ title, subtitle, tracks, onPlay, onQueueAdd }) {
  if (!tracks || tracks.length === 0) return null;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted">{subtitle}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {tracks.map((t) => (
          <TrackCard key={t.videoId} track={t} onPlay={onPlay} onQueueAdd={onQueueAdd} />
        ))}
      </div>
    </div>
  );
}

export default function DiscoverPanel({ buckets, loading, onPlay, onQueueAdd }) {
  if (loading) {
    return <p className="text-sm text-muted py-6 text-center">Building your recommendations…</p>;
  }
  if (!buckets || (buckets.sameVibe.length === 0 && buckets.samePhase.length === 0 && buckets.discovery.length === 0)) {
    return (
      <p className="text-sm text-muted py-6 text-center">
        Play something to see songs that feel right after it.
      </p>
    );
  }
  return (
    <div className="space-y-6">
      <Rail title="Same Vibe" subtitle="Feels just like this" tracks={buckets.sameVibe} onPlay={onPlay} onQueueAdd={onQueueAdd} />
      <Rail title="Same Phase" subtitle="Fits where you are right now" tracks={buckets.samePhase} onPlay={onPlay} onQueueAdd={onQueueAdd} />
      <Rail title="Discovery" subtitle="A little different, still connected" tracks={buckets.discovery} onPlay={onPlay} onQueueAdd={onQueueAdd} />
      <Rail title="Exploration" subtitle="Something new to try" tracks={buckets.exploration} onPlay={onPlay} onQueueAdd={onQueueAdd} />
    </div>
  );
}
