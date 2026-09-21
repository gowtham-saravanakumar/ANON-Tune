export function PlayIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export function PauseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}

export function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

export function NextIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
      <path d="M6 5v14l9-7zM16 5v14h2V5z" />
    </svg>
  );
}

export function PrevIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
      <path d="M18 5v14l-9-7zM8 5v14H6V5z" />
    </svg>
  );
}

export function HeartIcon({ filled, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 21s-7.5-4.7-10-9.3C.4 8.1 2.2 4.5 5.8 4c2-.3 3.9.6 5.2 2.3C12.3 4.6 14.2 3.7 16.2 4c3.6.5 5.4 4.1 3.8 7.7C19.5 16.3 12 21 12 21z" />
    </svg>
  );
}

export function ChevronIcon({ up, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {up ? <path d="M18 15l-6-6-6 6" /> : <path d="M6 9l6 6 6-6" />}
    </svg>
  );
}

export function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...props}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function QueueIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 6h12M4 12h12M4 18h8" />
      <path d="M18 10v8M15 15l3 3 3-3" />
    </svg>
  );
}

export function SparkleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" {...props}>
      <path d="M12 2l1.8 5.6L19 9.5l-5.2 1.9L12 17l-1.8-5.6L5 9.5l5.2-1.9z" />
    </svg>
  );
}
