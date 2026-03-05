import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/common/Badge";
import { Package, MapPin, Lightbulb } from "lucide-react";

interface AnomalyData {
  id: string;
  type: "misplaced" | "missing" | "overflow" | "damaged";
  position: string;
  aisle: string;
  bay: string;
  level: string;
  description: string;
  recommendedAction: string;
  confidence: number;
  detectedAt: string;
}

interface AnomalyCardProps {
  anomaly: AnomalyData;
  className?: string;
}

const typeVariant: Record<string, "critical" | "warning" | "info" | "success"> = {
  misplaced: "warning",
  missing: "critical",
  overflow: "warning",
  damaged: "critical",
};

const typeLabel: Record<string, string> = {
  misplaced: "Misplaced Item",
  missing: "Missing Item",
  overflow: "Overflow",
  damaged: "Damaged",
};

export const AnomalyCard: React.FC<AnomalyCardProps> = ({
  anomaly,
  className,
}) => {
  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-card overflow-hidden hover:border-accent/20 transition-all",
        className
      )}
    >
      {/* Thumbnail area */}
      <div className="relative aspect-[16/9] bg-background">
        <div className="absolute inset-0 flex items-center justify-center">
          <Package className="w-10 h-10 text-text-muted/15" />
        </div>

        {/* Anomaly highlight area */}
        <div
          className="absolute border-2 border-critical/60 rounded bg-critical/5"
          style={{ left: "30%", top: "25%", width: "40%", height: "50%" }}
        >
          <span className="absolute -top-4 left-0 text-[9px] bg-critical text-white px-1 rounded-sm">
            {typeLabel[anomaly.type]}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Badge variant={typeVariant[anomaly.type]} dot>
            {typeLabel[anomaly.type]}
          </Badge>
          <span className="text-xs text-text-muted">
            {(anomaly.confidence * 100).toFixed(0)}% conf
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <MapPin className="w-3.5 h-3.5 text-text-muted" />
          <span className="font-mono">
            {anomaly.aisle}-{anomaly.bay}-{anomaly.level}
          </span>
          <span className="text-text-muted">({anomaly.position})</span>
        </div>

        {/* Description */}
        <p className="text-sm text-text-secondary">{anomaly.description}</p>

        {/* Recommended action */}
        <div className="flex items-start gap-2 p-2 bg-accent/5 rounded-button border border-accent/10">
          <Lightbulb className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
          <p className="text-xs text-accent/80">{anomaly.recommendedAction}</p>
        </div>
      </div>
    </div>
  );
};

export type { AnomalyData };
