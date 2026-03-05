import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  accentHighlight?: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  label,
  value,
  trend,
  accentHighlight = false,
  className,
}) => {
  const trendIsPositive =
    trend && ((trend.direction === "up" && trend.value >= 0) || (trend.direction === "down" && trend.value < 0));

  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-card p-4 flex items-start gap-4 transition-all hover:border-accent/20",
        accentHighlight && "border-accent/30 shadow-[0_0_20px_rgba(0,255,178,0.05)]",
        className
      )}
    >
      <div
        className={cn(
          "p-2.5 rounded-button",
          accentHighlight
            ? "bg-accent/10 text-accent"
            : "bg-surface-elevated text-text-secondary"
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-muted font-medium uppercase tracking-wider">
          {label}
        </p>
        <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            {trend.direction === "up" ? (
              <TrendingUp
                className={cn(
                  "w-3.5 h-3.5",
                  trendIsPositive ? "text-accent" : "text-critical"
                )}
              />
            ) : (
              <TrendingDown
                className={cn(
                  "w-3.5 h-3.5",
                  trendIsPositive ? "text-accent" : "text-critical"
                )}
              />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                trendIsPositive ? "text-accent" : "text-critical"
              )}
            >
              {Math.abs(trend.value).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
