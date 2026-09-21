import { useEffect, useRef, useState } from "react";
import { SearchIcon, XIcon } from "./icons";

export default function SearchBar({ onPlay, onQueueAdd, onSearchTerm }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  const debounceRef = useRef(null);
  const seq = useRef(0);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const mySeq = ++seq.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (mySeq !== seq.current) return;
        if (data.error) {
          setError(data.error);
          setResults([]);
        } else {
          setError(null);
          setResults(data.results || []);
          onSearchTerm?.(query.trim());
        }
      } catch {
        if (mySeq !== seq.current) return;
        setError("Couldn't reach search — check your connection.");
        setResults([]);
      } finally {
        if (mySeq === seq.current) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function play(r) {
    onPlay(r);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="flex items-center gap-2 bg-elevated border border-border rounded-full px-4 py-2.5 focus-within:border-warm transition-colors">
        <SearchIcon className="text-muted shrink-0" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search for a song, artist, or mood…"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-muted hover:text-ptext shrink-0">
            <XIcon />
          </button>
        )}
      </div>

      {open && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 mt-2 max-h-80 overflow-y-auto bg-card border border-border rounded-2xl shadow-glow z-30">
          {searching && <p className="p-3 text-sm text-muted">Searching…</p>}
          {!searching && error && <p className="p-3 text-sm text-danger">{error}</p>}
          {!searching && !error && results.length === 0 && (
            <p className="p-3 text-sm text-muted">No results for “{query.trim()}”.</p>
          )}
          {!searching &&
            results.map((r) => (
              <div
                key={r.videoId}
                onClick={() => play(r)}
                className="flex items-center gap-3 p-2 hover:bg-elevated cursor-pointer border-b border-border last:border-b-0 transition-colors"
              >
                <div className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-elevated border border-border">
                  {r.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.thumbnail} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="text-xs text-muted truncate">
                    {r.channel} {r.duration ? `· ${r.duration}` : ""}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQueueAdd(r);
                  }}
                  className="shrink-0 text-xs border border-border rounded-lg px-2.5 py-1.5 hover:border-cool hover:text-cool transition"
                >
                  + Queue
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
