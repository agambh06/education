import type { ColorTone } from "../../types/domain";
interface StatCardProps {
  icon: string;
  tone: ColorTone;
  value: string;
  label: string;
  note: string;
}
export function StatCard({ icon, tone, value, label, note }: StatCardProps) {
  return (
    <article className="stat">
      <span className={"stat-icon " + tone}>{icon}</span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
        <small>{note}</small>
      </div>
    </article>
  );
}
