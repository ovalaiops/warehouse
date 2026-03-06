import React from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  header?: {
    title: React.ReactNode;
    action?: React.ReactNode;
  };
}

const paddingStyles: Record<string, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export const Card: React.FC<CardProps> = ({
  children,
  className,
  padding = "md",
  header,
}) => {
  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-card overflow-hidden",
        className
      )}
    >
      {header && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary font-display">
            {header.title}
          </h3>
          {header.action}
        </div>
      )}
      <div className={paddingStyles[padding]}>{children}</div>
    </div>
  );
};
