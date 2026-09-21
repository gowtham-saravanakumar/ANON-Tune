const LINKS = [
  { label: "Instagram", href: "https://www.instagram.com/gowtham_saravanakumar/" },
  { label: "X (Twitter)", href: "https://x.com/gowtham_says" },
  { label: "LinkedIn", href: "https://in.linkedin.com/in/gowtham-now" },
  { label: "GitHub", href: "https://github.com/gowtham-saravanakumar" },
];

const COFFEE_URL = "https://buymeacoffee.com/gowthamsaravanakumar";

/**
 * Creator credit block, shown across the app.
 * Use `compact` for tight/no-scroll layouts (e.g. the room screen).
 */
export default function Credits({ compact = false }) {
  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] leading-none text-muted">
        <span>
          Made by <span className="text-ptext font-medium">Gowtham Saravanakumar</span>
        </span>
        {LINKS.map((link) => (
          <span key={link.href} className="flex items-center gap-x-2">
            <span className="text-border">·</span>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cool hover:underline"
            >
              {link.label}
            </a>
          </span>
        ))}
        <span className="text-border">·</span>
        <a
          href={COFFEE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-warm font-medium hover:underline"
        >
          ☕ Buy me a coffee
        </a>
      </div>
    );
  }

  return (
    <footer className="text-center text-xs text-muted space-y-2">
      <p>
        Created by <span className="text-ptext font-medium">Gowtham Saravanakumar</span>
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {LINKS.map((link, i) => (
          <span key={link.href} className="flex items-center gap-x-3">
            {i > 0 && <span className="text-border">·</span>}
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cool hover:underline"
            >
              {link.label}
            </a>
          </span>
        ))}
      </div>
      <div>
        <a
          href={COFFEE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-1 bg-warm text-white font-medium rounded-full px-4 py-1.5 hover:brightness-110 transition"
        >
          ☕ Buy me a coffee
        </a>
      </div>
    </footer>
  );
}
