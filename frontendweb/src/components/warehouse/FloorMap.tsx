import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Camera, Thermometer } from "lucide-react";

interface ZoneData {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  fillColor: string;
}

interface CameraPos {
  id: string;
  label: string;
  x: number;
  y: number;
  rotation: number;
}

const zones: ZoneData[] = [
  { id: "z-1", label: "Receiving", type: "receiving", x: 20, y: 20, w: 200, h: 150, color: "#00ffb2", fillColor: "rgba(0,255,178,0.06)" },
  { id: "z-2", label: "Storage A", type: "storage", x: 240, y: 20, w: 250, h: 150, color: "#3b82f6", fillColor: "rgba(59,130,246,0.06)" },
  { id: "z-3", label: "Storage B", type: "storage", x: 240, y: 190, w: 250, h: 150, color: "#3b82f6", fillColor: "rgba(59,130,246,0.06)" },
  { id: "z-4", label: "Picking", type: "picking", x: 510, y: 20, w: 200, h: 150, color: "#ffb800", fillColor: "rgba(255,184,0,0.06)" },
  { id: "z-5", label: "Shipping", type: "shipping", x: 510, y: 190, w: 200, h: 150, color: "#f06", fillColor: "rgba(255,0,102,0.06)" },
  { id: "z-6", label: "Dock A", type: "dock", x: 20, y: 190, w: 95, h: 150, color: "#ffb800", fillColor: "rgba(255,184,0,0.06)" },
  { id: "z-7", label: "Dock B", type: "dock", x: 125, y: 190, w: 95, h: 150, color: "#ffb800", fillColor: "rgba(255,184,0,0.06)" },
  { id: "z-8", label: "Cold Storage", type: "restricted", x: 730, y: 20, w: 150, h: 320, color: "#8b5cf6", fillColor: "rgba(139,92,246,0.06)" },
];

const cameras: CameraPos[] = [
  { id: "cam-1", label: "C1", x: 60, y: 50, rotation: 135 },
  { id: "cam-2", label: "C2", x: 365, y: 50, rotation: 180 },
  { id: "cam-3", label: "C3", x: 120, y: 220, rotation: 90 },
  { id: "cam-4", label: "C4", x: 610, y: 50, rotation: 225 },
  { id: "cam-5", label: "C5", x: 510, y: 220, rotation: 0 },
  { id: "cam-6", label: "C6", x: 805, y: 180, rotation: 270 },
];

// Heatmap data points
const heatmapPoints = [
  { x: 100, y: 100, intensity: 0.9 },
  { x: 300, y: 80, intensity: 0.5 },
  { x: 360, y: 250, intensity: 0.7 },
  { x: 550, y: 100, intensity: 0.4 },
  { x: 150, y: 250, intensity: 0.8 },
  { x: 600, y: 260, intensity: 0.6 },
  { x: 780, y: 170, intensity: 0.3 },
];

interface FloorMapProps {
  showCameras?: boolean;
  showHeatmap?: boolean;
  onZoneClick?: (zoneId: string) => void;
  className?: string;
}

export const FloorMap: React.FC<FloorMapProps> = ({
  showCameras: initialShowCameras = true,
  showHeatmap: initialShowHeatmap = false,
  onZoneClick,
  className,
}) => {
  const [showCameras, setShowCameras] = useState(initialShowCameras);
  const [showHeatmap, setShowHeatmap] = useState(initialShowHeatmap);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  const zoneTypes = [
    { type: "receiving", color: "#00ffb2", label: "Receiving" },
    { type: "storage", color: "#3b82f6", label: "Storage" },
    { type: "picking", color: "#ffb800", label: "Picking" },
    { type: "shipping", color: "#f06", label: "Shipping" },
    { type: "dock", color: "#ffb800", label: "Dock" },
    { type: "restricted", color: "#8b5cf6", label: "Restricted" },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowCameras(!showCameras)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-button border transition-colors",
            showCameras
              ? "bg-accent/10 border-accent/30 text-accent"
              : "bg-surface-elevated border-border text-text-muted"
          )}
        >
          <Camera className="w-3.5 h-3.5" />
          Cameras
        </button>
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-button border transition-colors",
            showHeatmap
              ? "bg-warning/10 border-warning/30 text-warning"
              : "bg-surface-elevated border-border text-text-muted"
          )}
        >
          <Thermometer className="w-3.5 h-3.5" />
          Heatmap
        </button>
      </div>

      {/* Map */}
      <div className="relative bg-background rounded-card border border-border overflow-hidden">
        <svg viewBox="0 0 900 360" className="w-full h-full">
          {/* Grid */}
          {Array.from({ length: 46 }).map((_, i) => (
            <line key={`v-${i}`} x1={i * 20} y1="0" x2={i * 20} y2="360" stroke="rgba(95,95,113,0.06)" strokeWidth="0.5" />
          ))}
          {Array.from({ length: 19 }).map((_, i) => (
            <line key={`h-${i}`} x1="0" y1={i * 20} x2="900" y2={i * 20} stroke="rgba(95,95,113,0.06)" strokeWidth="0.5" />
          ))}

          {/* Heatmap */}
          {showHeatmap && (
            <g>
              {heatmapPoints.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={40 * pt.intensity}
                  fill={`rgba(255,184,0,${pt.intensity * 0.25})`}
                  className="transition-all duration-500"
                />
              ))}
            </g>
          )}

          {/* Zones */}
          {zones.map((zone) => (
            <g
              key={zone.id}
              className="cursor-pointer"
              onClick={() => onZoneClick?.(zone.id)}
              onMouseEnter={() => setHoveredZone(zone.id)}
              onMouseLeave={() => setHoveredZone(null)}
            >
              <rect
                x={zone.x}
                y={zone.y}
                width={zone.w}
                height={zone.h}
                fill={hoveredZone === zone.id ? zone.fillColor.replace("0.06", "0.12") : zone.fillColor}
                stroke={zone.color}
                strokeWidth={hoveredZone === zone.id ? "2" : "1"}
                strokeOpacity="0.4"
                rx="6"
                className="transition-all duration-200"
              />
              <text
                x={zone.x + zone.w / 2}
                y={zone.y + zone.h / 2 - 4}
                textAnchor="middle"
                fontSize="12"
                fill={zone.color}
                fontFamily="DM Sans"
                fontWeight="600"
                opacity="0.8"
              >
                {zone.label}
              </text>
              <text
                x={zone.x + zone.w / 2}
                y={zone.y + zone.h / 2 + 12}
                textAnchor="middle"
                fontSize="9"
                fill="rgba(161,161,170,0.5)"
                fontFamily="DM Sans"
              >
                {zone.type}
              </text>
            </g>
          ))}

          {/* Cameras */}
          {showCameras &&
            cameras.map((cam) => (
              <g key={cam.id}>
                {/* Field of view cone */}
                <path
                  d={`M ${cam.x} ${cam.y} l ${Math.cos(((cam.rotation - 30) * Math.PI) / 180) * 40} ${Math.sin(((cam.rotation - 30) * Math.PI) / 180) * 40} A 40 40 0 0 1 ${cam.x + Math.cos(((cam.rotation + 30) * Math.PI) / 180) * 40} ${cam.y + Math.sin(((cam.rotation + 30) * Math.PI) / 180) * 40} Z`}
                  fill="rgba(0,255,178,0.06)"
                  stroke="rgba(0,255,178,0.15)"
                  strokeWidth="0.5"
                />
                {/* Camera icon */}
                <circle cx={cam.x} cy={cam.y} r="8" fill="#17171d" stroke="#00ffb2" strokeWidth="1.5" />
                <text
                  x={cam.x}
                  y={cam.y + 3.5}
                  textAnchor="middle"
                  fontSize="7"
                  fill="#00ffb2"
                  fontFamily="DM Sans"
                  fontWeight="700"
                >
                  {cam.label}
                </text>
              </g>
            ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4">
        {zoneTypes.map((zt) => (
          <div key={zt.type} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm border"
              style={{
                backgroundColor: `${zt.color}10`,
                borderColor: `${zt.color}40`,
              }}
            />
            <span className="text-xs text-text-muted">{zt.label}</span>
          </div>
        ))}
        {showCameras && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border border-accent bg-surface" />
            <span className="text-xs text-text-muted">Camera</span>
          </div>
        )}
      </div>
    </div>
  );
};
