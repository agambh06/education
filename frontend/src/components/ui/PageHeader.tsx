import type { ReactNode } from "react";
interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}
export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <section className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </section>
  );
}
