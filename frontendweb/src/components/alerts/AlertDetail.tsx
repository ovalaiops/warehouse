import React, { useState } from "react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  Brain,
} from "lucide-react";
import type { Alert, AlertSeverity } from "@/types";

interface AlertDetailProps {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

const severityVariant: Record<AlertSeverity, "critical" | "warning" | "info"> = {
  critical: "critical",
  warning: "warning",
  info: "info",
};

export const AlertDetail: React.FC<AlertDetailProps> = ({
  alert,
  onAcknowledge,
  onResolve,
  onDismiss,
}) => {
  const [showReasoning, setShowReasoning] = useState(false);

  const timelineEvents = [
    { label: "Detected", time: alert.detectedAt, icon: Eye },
    ...(alert.acknowledgedAt
      ? [{ label: "Acknowledged", time: alert.acknowledgedAt, icon: CheckCircle }]
      : []),
    ...(alert.resolvedAt
      ? [{ label: "Resolved", time: alert.resolvedAt, icon: CheckCircle }]
      : []),
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={severityVariant[alert.severity]} dot>
              {alert.severity}
            </Badge>
            <Badge variant="info">{alert.type}</Badge>
            <span className="text-xs text-text-muted px-2 py-0.5 bg-surface-elevated rounded-badge">
              {alert.status}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-text-primary">
            {alert.title}
          </h2>
        </div>
      </div>

      {/* Video / Image with bounding boxes */}
      <div className="relative bg-background rounded-card overflow-hidden aspect-video border border-border">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Eye className="w-12 h-12 text-text-muted/20 mx-auto mb-2" />
            <p className="text-xs text-text-muted">Camera Feed Snapshot</p>
          </div>
        </div>

        {/* Bounding box overlays */}
        {alert.detections?.map((det, i) => {
          if (!det.bbox) return null;
          const [x1, y1, x2, y2] = det.bbox;
          const scaleX = 100 / 640;
          const scaleY = 100 / 480;
          return (
            <div
              key={i}
              className="absolute border-2 border-critical rounded"
              style={{
                left: `${x1 * scaleX}%`,
                top: `${y1 * scaleY}%`,
                width: `${(x2 - x1) * scaleX}%`,
                height: `${(y2 - y1) * scaleY}%`,
              }}
            >
              <span className="absolute -top-5 left-0 text-[10px] bg-critical text-white px-1 rounded-sm whitespace-nowrap">
                {det.label} {det.confidence ? `${(det.confidence * 100).toFixed(0)}%` : ""}
              </span>
            </div>
          );
        })}
      </div>

      {/* Description */}
      {alert.description && (
        <div className="p-3 bg-surface-elevated rounded-button">
          <p className="text-sm text-text-secondary">{alert.description}</p>
        </div>
      )}

      {/* Chain-of-thought reasoning */}
      {alert.reasoning && (
        <div className="border border-border rounded-button overflow-hidden">
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className="flex items-center justify-between w-full px-4 py-3 hover:bg-surface-elevated transition-colors"
          >
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-text-primary">
                AI Chain-of-Thought Reasoning
              </span>
            </div>
            {showReasoning ? (
              <ChevronUp className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            )}
          </button>
          {showReasoning && (
            <div className="px-4 pb-3 border-t border-border pt-3">
              <p className="text-sm text-text-secondary leading-relaxed font-mono">
                {alert.reasoning}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Detection details */}
      {alert.detections && alert.detections.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Detections
          </h4>
          <div className="space-y-1">
            {alert.detections.map((det, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2 bg-surface-elevated rounded-button text-sm"
              >
                <span className="text-text-primary">{det.label}</span>
                <div className="flex items-center gap-3">
                  {det.confidence && (
                    <span className="text-text-muted text-xs">
                      Confidence: {(det.confidence * 100).toFixed(1)}%
                    </span>
                  )}
                  {det.bbox && (
                    <span className="text-text-muted text-xs font-mono">
                      [{det.bbox.join(", ")}]
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Timeline
        </h4>
        <div className="space-y-0">
          {timelineEvents.map((event, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="w-6 h-6 rounded-full bg-surface-elevated flex items-center justify-center flex-shrink-0">
                <event.icon className="w-3.5 h-3.5 text-accent" />
              </div>
              <div className="flex-1 flex items-center justify-between">
                <span className="text-sm text-text-primary">{event.label}</span>
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <Clock className="w-3 h-3" />
                  {new Date(event.time).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        {alert.status === "new" && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onAcknowledge?.(alert.id)}
          >
            <CheckCircle className="w-4 h-4" />
            Acknowledge
          </Button>
        )}
        {(alert.status === "new" || alert.status === "acknowledged") && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onResolve?.(alert.id)}
          >
            <CheckCircle className="w-4 h-4" />
            Resolve
          </Button>
        )}
        {alert.status !== "dismissed" && alert.status !== "resolved" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss?.(alert.id)}
          >
            <XCircle className="w-4 h-4" />
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
};
