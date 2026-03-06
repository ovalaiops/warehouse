import React, { useState, useEffect } from "react";
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

// Map alert types to scene generation scenarios
const ALERT_TYPE_SCENARIO: Record<string, string> = {
  safety: "safety",
  inventory: "inventory",
  congestion: "fleet",
  security: "caption",
  quality: "quality",
};

// Cache generated scene images so we don't re-fetch on every render
const sceneImageCache: Record<string, string> = {};

function getSceneImage(scenario: string): string {
  if (sceneImageCache[scenario]) return sceneImageCache[scenario];
  const dataUrl = drawAlertScene(scenario);
  sceneImageCache[scenario] = dataUrl;
  return dataUrl;
}

/** Draw a lightweight scene on canvas for each alert type */
function drawAlertScene(scenario: string): string {
  const w = 640, h = 360;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const txt = (text: string, x: number, y: number, color: string, size = 10) => {
    ctx.fillStyle = color; ctx.font = `${size}px monospace`; ctx.fillText(text, x, y);
  };

  switch (scenario) {
    case "safety": {
      // Dark warehouse floor
      ctx.fillStyle = "#1a1a2e"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#2a2a2a"; ctx.fillRect(0, h * 0.55, w, h * 0.45);
      // Floor markings
      ctx.strokeStyle = "#4a4a2a"; ctx.lineWidth = 2;
      for (let x = 0; x < w; x += 60) { ctx.beginPath(); ctx.moveTo(x, h * 0.55); ctx.lineTo(x + 20, h); ctx.stroke(); }
      // Racks left & right
      for (const rx of [20, 460]) {
        for (let lv = 0; lv < 3; lv++) {
          const y = 20 + lv * 80;
          ctx.fillStyle = "#555"; ctx.fillRect(rx, y + 65, 150, 8);
          ctx.fillStyle = "#666"; ctx.fillRect(rx, y, 6, 73); ctx.fillRect(rx + 144, y, 6, 73);
          for (let bx = 0; bx < 3; bx++) {
            ctx.fillStyle = "#8B6914"; ctx.fillRect(rx + 10 + bx * 45, y + 12, 38, 48);
          }
        }
      }
      // Forklift
      ctx.fillStyle = "#D4A017"; ctx.fillRect(230, h * 0.48, 55, 35);
      ctx.fillRect(245, h * 0.38, 30, h * 0.1);
      ctx.fillStyle = "#333";
      ctx.beginPath(); ctx.arc(240, h * 0.48 + 38, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(275, h * 0.48 + 38, 6, 0, Math.PI * 2); ctx.fill();
      // Workers
      ctx.fillStyle = "#FF6B35"; ctx.fillRect(380, h * 0.38, 16, 30);
      ctx.fillStyle = "#FFCC99"; ctx.beginPath(); ctx.arc(388, h * 0.34, 7, 0, Math.PI * 2); ctx.fill();
      // Compliant worker with hat
      ctx.fillStyle = "#FF6B35"; ctx.fillRect(100, h * 0.38, 16, 30);
      ctx.fillStyle = "#FFCC99"; ctx.beginPath(); ctx.arc(108, h * 0.34, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#FFD700"; ctx.beginPath(); ctx.arc(108, h * 0.31, 9, Math.PI, 0); ctx.fill();
      // Spill
      ctx.fillStyle = "#4444AA"; ctx.beginPath(); ctx.ellipse(520, h * 0.75, 35, 14, 0, 0, Math.PI * 2); ctx.fill();
      txt("CAM-03 | ZONE B", 8, 14, "#555"); txt("LIVE", w - 40, 14, "#ff0066", 12);
      break;
    }
    case "inventory": {
      ctx.fillStyle = "#1e1e2e"; ctx.fillRect(0, 0, w, h);
      for (let lv = 0; lv < 4; lv++) {
        const y = 10 + lv * 85;
        ctx.fillStyle = "#555"; ctx.fillRect(15, y + 72, w - 30, 6);
        ctx.fillStyle = "#666"; ctx.fillRect(15, y, 8, 78); ctx.fillRect(w - 23, y, 8, 78);
        const colors = ["#8B6914", "#5B4A08", "#A0782C", "#6B5A1A"];
        for (let c = 0; c < 7; c++) {
          const bx = 30 + c * 85;
          if (lv === 1 && c === 4) { ctx.strokeStyle = "#444"; ctx.lineWidth = 1; ctx.strokeRect(bx, y + 10, 72, 55); txt("EMPTY", bx + 15, y + 42, "#666"); continue; }
          if (lv === 2 && c === 2) { ctx.fillStyle = "#8B2020"; ctx.fillRect(bx, y + 10, 72, 55); txt("DAMAGED", bx + 8, y + 42, "#FF6666"); continue; }
          ctx.fillStyle = colors[c % 4]; ctx.fillRect(bx, y + 10, 72, 55);
        }
      }
      txt("AISLE A | RACK AUDIT", 8, h - 8, "#555");
      break;
    }
    case "fleet": {
      ctx.fillStyle = "#2a2a2a"; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#4a4a00"; ctx.lineWidth = 2;
      for (const y2 of [100, 200, 300]) { ctx.beginPath(); ctx.moveTo(0, y2); ctx.lineTo(w, y2); ctx.stroke(); }
      for (const x of [160, 320, 480]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      // Dock doors
      for (let i = 0; i < 3; i++) { ctx.fillStyle = "#555"; ctx.fillRect(40 + i * 200, h - 30, 100, 30); txt(`DOCK ${i + 1}`, 60 + i * 200, h - 10, "#AAA"); }
      // Forklifts
      ctx.fillStyle = "#D4A017"; ctx.fillRect(220, 140, 35, 28); txt("FL-01", 224, 160, "#000", 8);
      ctx.fillStyle = "#D4A017"; ctx.fillRect(400, h - 65, 35, 28); txt("FL-02", 404, h - 45, "#000", 8);
      // AGV
      ctx.fillStyle = "#3b82f6"; ctx.fillRect(310, 240, 32, 24); txt("AGV", 314, 256, "#FFF", 8);
      // Trajectory
      ctx.strokeStyle = "#00ffb2"; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(130, 154); ctx.lineTo(170, 154); ctx.lineTo(220, 154); ctx.stroke(); ctx.setLineDash([]);
      txt("OVERHEAD | FLEET TRACKING", 8, 14, "#555");
      break;
    }
    case "quality": {
      ctx.fillStyle = "#888"; ctx.fillRect(0, h * 0.4, w, h * 0.6);
      ctx.fillStyle = "#2a2a3e"; ctx.fillRect(0, 0, w, h * 0.4);
      // Package
      ctx.fillStyle = "#C4A45C"; ctx.fillRect(140, 50, 360, 250);
      ctx.strokeStyle = "#8B7340"; ctx.lineWidth = 2; ctx.strokeRect(140, 50, 360, 250);
      // Label
      ctx.fillStyle = "#FFF"; ctx.fillRect(160, 70, 160, 80);
      txt("SHIP TO:", 170, 90, "#000"); txt("Chicago DC", 170, 108, "#333"); txt("1200 Industrial", 170, 122, "#333");
      for (let i = 0; i < 15; i++) { ctx.fillStyle = "#000"; ctx.fillRect(170 + i * 7, 130, 3, 18); }
      // FRAGILE
      ctx.fillStyle = "#FF0000"; ctx.fillRect(360, 80, 80, 40); txt("FRAGILE", 370, 105, "#FFF", 12);
      // Tear
      ctx.strokeStyle = "#FF4444"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(460, 50); ctx.lineTo(500, 100); ctx.stroke();
      // Tape
      ctx.fillStyle = "#CCCC88"; ctx.fillRect(140, 175, 360, 12);
      txt("QC STATION 3", 8, h - 8, "#444");
      break;
    }
    default: {
      // General warehouse scene
      ctx.fillStyle = "#1a1a2e"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#2a2a2a"; ctx.fillRect(0, h * 0.55, w, h * 0.45);
      for (const rx of [20, 460]) {
        for (let lv = 0; lv < 3; lv++) {
          const y = 20 + lv * 80;
          ctx.fillStyle = "#555"; ctx.fillRect(rx, y + 65, 150, 8);
          for (let bx = 0; bx < 3; bx++) { ctx.fillStyle = "#8B6914"; ctx.fillRect(rx + 10 + bx * 45, y + 12, 38, 48); }
        }
      }
      // Conveyor
      ctx.fillStyle = "#444"; ctx.fillRect(60, h * 0.5, 520, 12);
      // Workers
      ctx.fillStyle = "#FF6B35"; ctx.fillRect(200, h * 0.35, 14, 25);
      ctx.fillStyle = "#FF6B35"; ctx.fillRect(400, h * 0.38, 14, 25);
      txt("WAREHOUSE CAM | MAIN FLOOR", 8, 14, "#555"); txt("LIVE", w - 40, 14, "#ff0066", 12);
    }
  }
  return canvas.toDataURL("image/jpeg", 0.85);
}

// Detection color mapping
const DETECTION_COLORS: Record<string, string> = {
  forklift: "#00ffb2",
  person: "#3b82f6",
  pallet: "#ffb800",
  person_no_hardhat: "#ff0066",
  no_hardhat: "#ff0066",
  spill: "#ff0066",
  violation: "#ff0066",
  near_miss: "#ff0066",
  unstable: "#ffb800",
  blocked: "#ff0066",
};

function getDetectionColor(label: string): string {
  const lower = label.toLowerCase();
  for (const [key, color] of Object.entries(DETECTION_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return "#ff0066";
}

export const AlertDetail: React.FC<AlertDetailProps> = ({
  alert,
  onAcknowledge,
  onResolve,
  onDismiss,
}) => {
  const [showReasoning, setShowReasoning] = useState(false);
  const [sceneImage, setSceneImage] = useState<string | null>(null);

  // Generate scene image for the alert type (client-side canvas, instant)
  useEffect(() => {
    const scenario = ALERT_TYPE_SCENARIO[alert.type] || "caption";
    setSceneImage(getSceneImage(scenario));
  }, [alert.type]);

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

      {/* Camera Feed Snapshot with bounding boxes */}
      <div className="relative bg-background rounded-card overflow-hidden aspect-video border border-border">
        {/* Scene image background */}
        {sceneImage ? (
          <img
            src={sceneImage}
            alt={`${alert.type} scene`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16162a] to-[#0f0f1a]">
            {/* Simulated camera grid lines */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)
                `,
                backgroundSize: "40px 40px",
              }}
            />
            {/* Center placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Eye className="w-12 h-12 text-text-muted/10" />
            </div>
          </div>
        )}

        {/* Camera overlay HUD */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-badge">
          <div className="w-1.5 h-1.5 rounded-full bg-critical animate-pulse" />
          <span className="text-[9px] font-bold text-critical tracking-wider">REC</span>
        </div>
        <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-badge">
          <span className="text-[9px] text-text-muted font-mono">
            CAM-{alert.cameraId?.replace(/\D/g, "") || "03"} | {new Date(alert.detectedAt).toLocaleTimeString()}
          </span>
        </div>
        {alert.zoneId && (
          <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded-badge">
            <span className="text-[9px] text-text-muted font-mono">
              ZONE {alert.zoneId.replace(/\D/g, "").slice(-1) || "B"}
            </span>
          </div>
        )}

        {/* Bounding box overlays */}
        {alert.detections?.map((det, i) => {
          if (!det.bbox) return null;
          const [x1, y1, x2, y2] = det.bbox;
          const scaleX = 100 / 640;
          const scaleY = 100 / 480;
          const color = getDetectionColor(det.label);
          return (
            <div
              key={i}
              className="absolute border-2 rounded-sm"
              style={{
                left: `${x1 * scaleX}%`,
                top: `${y1 * scaleY}%`,
                width: `${(x2 - x1) * scaleX}%`,
                height: `${(y2 - y1) * scaleY}%`,
                borderColor: color,
                boxShadow: `0 0 8px ${color}40`,
              }}
            >
              <span
                className="absolute -top-5 left-0 text-[10px] text-white px-1.5 py-0.5 rounded-sm whitespace-nowrap font-mono"
                style={{ backgroundColor: color }}
              >
                {det.label.replace(/_/g, " ")} {det.confidence ? `${(det.confidence * 100).toFixed(0)}%` : ""}
              </span>
              {/* Corner marks for a more realistic detection look */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2" style={{ borderColor: color }} />
              <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2" style={{ borderColor: color }} />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2" style={{ borderColor: color }} />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2" style={{ borderColor: color }} />
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
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getDetectionColor(det.label) }}
                  />
                  <span className="text-text-primary">{det.label.replace(/_/g, " ")}</span>
                </div>
                <div className="flex items-center gap-3">
                  {det.confidence && (
                    <span className="text-text-muted text-xs">
                      {(det.confidence * 100).toFixed(1)}%
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
