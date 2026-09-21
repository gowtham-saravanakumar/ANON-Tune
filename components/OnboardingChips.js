import { useState } from "react";

const GENRES = ["pop", "hip-hop", "lo-fi", "edm", "rock", "indie", "rnb", "classical", "devotional", "kpop"];
const MOODS = ["happy", "chill", "energetic", "romantic", "sad", "nostalgic", "dreamy", "motivational"];

export default function OnboardingChips({ onDone }) {
  const [genres, setGenres] = useState([]);
  const [moods, setMoods] = useState([]);

  function toggle(list, setList, val) {
    setList((cur) => (cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val]));
  }

  return (
    <div className="max-w-lg mx-auto bg-card border border-border rounded-2xl p-6 space-y-5 animate-floatin">
      <div>
        <h2 className="font-display text-lg font-semibold">What are you into?</h2>
        <p className="text-sm text-muted mt-1">
          Pick a few genres and moods so ANON-Tune has somewhere to start. It'll keep learning from what you actually play.
        </p>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-muted mb-2">Genres</p>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => toggle(genres, setGenres, g)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                genres.includes(g) ? "bg-warm text-white border-warm" : "border-border text-muted hover:border-cool hover:text-cool"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-muted mb-2">Moods</p>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m}
              onClick={() => toggle(moods, setMoods, m)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                moods.includes(m) ? "bg-cool text-white border-cool" : "border-border text-muted hover:border-cool hover:text-cool"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={() => onDone([], [])} className="text-sm text-muted hover:text-ptext px-3 py-2">
          Skip
        </button>
        <button
          onClick={() => onDone(genres, moods)}
          className="text-sm bg-warm text-white rounded-full px-4 py-2 hover:brightness-110 transition"
        >
          Start listening
        </button>
      </div>
    </div>
  );
}
