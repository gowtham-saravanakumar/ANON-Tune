import { XIcon } from "./icons";

export default function QueuePanel({ queue, onPlayIndex, onRemove }) {
  if (!queue || queue.length === 0) {
    return <p className="text-sm text-muted py-4 text-center">Your queue is empty. Search for something to start.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {queue.map((t, i) => (
        <li
          key={t.videoId + i}
          className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2 text-sm"
        >
          <span className="text-xs text-muted w-4 text-right shrink-0">{i + 1}</span>
          <div className="relative shrink-0 w-11 h-11 rounded-lg overflow-hidden bg-elevated border border-border">
            {t.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.thumbnail} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <button onClick={() => onPlayIndex(i)} className="min-w-0 flex-1 text-left hover:text-warm transition-colors">
            <p className="truncate font-medium">{t.title}</p>
            <p className="truncate text-xs text-muted">{t.channel}</p>
          </button>
          <button onClick={() => onRemove(i)} className="text-muted hover:text-danger shrink-0 p-1">
            <XIcon />
          </button>
        </li>
      ))}
    </ul>
  );
}
