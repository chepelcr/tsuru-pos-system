import React from "react";
import { Icon } from "./Icon";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = "package", title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="icon-pill icon-pill-lg icon-pill-muted mb-4 w-16 h-16">
        <Icon name={icon} size={28} strokeWidth={1.5} />
      </div>
      <h3 className="t-h3 mb-1.5">{title}</h3>
      {description && (
        <p className="t-sm text-muted-foreground max-w-[360px] mb-5">{description}</p>
      )}
      {action}
    </div>
  );
}
