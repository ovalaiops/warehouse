import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/common/Badge";
import { Camera, Circle } from "lucide-react";
import type { Detection } from "@/types";

interface CameraPlayerProps {
  cameraId: string;
  cameraName: string;
  zone?: string;
  detections?: Detection[];
  trajectories?: Array<{ points: [number, number][]; color: string; label: string }>;
  className?: string;
}

const mockDetections: Detection[] = [
  { label: "forklift", bbox: [80, 120, 220, 300], confidence: 0.97 },
  { label: "person", bbox: [300, 100, 380, 340], confidence: 0.95 },
  { label: "pallet", bbox: [420, 200, 540, 320], confidence: 0.89 },
];

const mockTrajectories = [
  {
    points: [[100, 250], [150, 230], [200, 210], [260, 200], [320, 195]] as [number, number][],
    color: "#00ffb2",
    label: "FL-01",
  },
  {
    points: [[350, 150], [340, 180], [330, 220], [325, 260]] as [number, number][],
    color: "#3b82f6",
    label: "Worker-3",
  },
];

export const CameraPlayer: React.FC<CameraPlayerProps> = ({
  cameraName,
  zone,
  detections = mockDetections,
  trajectories = mockTrajectories,
  className,
}) => {
  return (
    <div className={cn("flex gap-4", className)}>
      {/* Video player with overlays */}
      <div className="flex-1 relative bg-background rounded-card overflow-hidden border border-border">
        <div className="aspect-video relative">
          {/* Simulated video feed */}
          <div className="absolute inset-0 bg-gradient-to-br from-surface-elevated via-background to-surface flex items-center justify-center">
            <Camera className="w-16 h-16 text-text-muted/10" />
          </div>

          {/* Scan lines */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="w-full h-px bg-white"
                style={{ marginTop: `${i * 2.5}%` }}
              />
            ))}
          </div>

          {/* Bounding boxes */}
          {detections.map((det, i) => {
            if (!det.bbox) return null;
            const [x1, y1, x2, y2] = det.bbox;
            const scaleX = 100 / 640;
            const scaleY = 100 / 480;
            const colors: Record<string, string> = {
              forklift: "#00ffb2",
              person: "#3b82f6",
              pallet: "#ffb800",
              person_no_hardhat: "#ff0066",
            };
            const color = colors[det.label] || "#00ffb2";
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
                }}
              >
                <span
                  className="absolute -top-5 left-0 text-[10px] text-white px-1 rounded-sm whitespace-nowrap"
                  style={{ backgroundColor: color }}
                >
                  {det.label} {det.confidence ? `${(det.confidence * 100).toFixed(0)}%` : ""}
                </span>
              </div>
            );
          })}

          {/* Trajectory paths (SVG overlay) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 640 480">
            {trajectories.map((traj, i) => (
              <g key={i}>
                <polyline
                  points={traj.points.map((p) => p.join(",")).join(" ")}
                  fill="none"
                  stroke={traj.color}
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  opacity="0.7"
                />
                {traj.points.map((p, j) => (
                  <circle
                    key={j}
                    cx={p[0]}
                    cy={p[1]}
                    r="3"
                    fill={traj.color}
                    opacity={0.4 + (j / traj.points.length) * 0.6}
                  />
                ))}
              </g>
            ))}
          </svg>

          {/* Live indicator */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/70 px-2 py-1 rounded-badge">
            <Circle className="w-2 h-2 fill-critical text-critical animate-pulse" />
            <span className="text-[10px] font-bold text-critical tracking-wider">LIVE</span>
          </div>

          {/* Camera info */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
            <p className="text-sm font-medium text-text-primary">{cameraName}</p>
            {zone && <p className="text-xs text-text-muted">{zone}</p>}
          </div>

          {/* Timestamp */}
          <div className="absolute top-3 right-3">
            <span className="text-[10px] text-text-muted bg-background/70 px-2 py-1 rounded-badge font-mono">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Detection info panel */}
      <div className="w-64 space-y-3 flex-shrink-0">
        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Active Detections
        </h4>
        {detections.map((det, i) => (
          <div
            key={i}
            className="p-3 bg-surface border border-border rounded-button"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-text-primary capitalize">
                {det.label.replace(/_/g, " ")}
              </span>
              <Badge variant={det.label.includes("no_") ? "critical" : "success"}>
                {det.confidence ? `${(det.confidence * 100).toFixed(0)}%` : "N/A"}
              </Badge>
            </div>
            {det.bbox && (
              <p className="text-xs text-text-muted font-mono">
                Box: [{det.bbox.join(", ")}]
              </p>
            )}
          </div>
        ))}

        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider pt-2">
          Tracked Objects
        </h4>
        {trajectories.map((traj, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-button"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: traj.color }}
            />
            <span className="text-sm text-text-primary">{traj.label}</span>
            <span className="text-xs text-text-muted ml-auto">
              {traj.points.length} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
