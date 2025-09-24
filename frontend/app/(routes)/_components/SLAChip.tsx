import { formatDistanceToNowStrict } from "date-fns";

interface Props {
  label: string;
  remainingHours: number;
  deadlineUtc: string;
}

export function SLAChip({ label, remainingHours, deadlineUtc }: Props) {
  const deadline = new Date(deadlineUtc);
  const isBreached = remainingHours < 0;
  const magnitude = Math.abs(remainingHours);
  const human = formatDistanceToNowStrict(deadline, { addSuffix: false });
  const headline = isBreached ? `Breached by ${human}` : `${human} left`;
  const color = isBreached ? "bg-sla-breach text-white" : "bg-sla-ok text-white";

  return (
    <div className={`chip ${color}`} aria-live="polite">
      <span className="font-semibold">{label}</span>
      <span>{headline}</span>
    </div>
  );
}
