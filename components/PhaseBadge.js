import { SparkleIcon } from "./icons";

export default function PhaseBadge({ phase, confidence, trackCount }) {
  if (!phase) return null;
  const label = phase.replace(" Phase", "");
  return (
    <div className="inline-flex items-center gap-1.5 bg-warmsoft text-warm border border-warm/20 rounded-full px-3 py-1 text-xs font-medium">
      <SparkleIcon />
      <span>{label} phase</span>
      {trackCount > 0 && <span className="text-warm/60 font-normal">· learning from your last {trackCount} tracks</span>}
      {trackCount === 0 && <span className="text-warm/60 font-normal">· based on the time of day</span>}
    </div>
  );
}
