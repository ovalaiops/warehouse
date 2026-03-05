import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  variant?: "critical" | "warning" | "info" | "success";
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<string, string> = {
  critical: "bg-critical/15 text-critical border-critical/20",
  warning: "bg-warning/15 text-warning border-warning/20",
  info: "bg-info/15 text-info border-info/20",
  success: "bg-accent/15 text-accent border-accent/20",
};

const dotColors: Record<string, string> = {
  critical: "bg-critical",
  warning: "bg-warning",
  info: "bg-info",
  success: "bg-accent",
};

export const Badge: React.FC<BadgeProps> = ({
  variant = "info",
  dot = false,
  children,
  className,
}) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-badge border",
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full", dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
};
