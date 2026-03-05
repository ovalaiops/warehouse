import React from "react";

interface Vehicle {
  id: string;
  label: string;
  x: number;
  y: number;
  status: "active" | "idle" | "charging";
}

const mockVehicles: Vehicle[] = [
  { id: "fl-1", label: "FL-01", x: 120, y: 80, status: "active" },
  { id: "fl-2", label: "FL-02", x: 280, y: 150, status: "active" },
  { id: "fl-3", label: "FL-03", x: 380, y: 200, status: "idle" },
  { id: "fl-4", label: "FL-04", x: 200, y: 250, status: "active" },
  { id: "fl-5", label: "PJ-01", x: 450, y: 120, status: "charging" },
];

const zones = [
  { id: "receiving", label: "Receiving", x: 20, y: 20, w: 140, h: 120, color: "rgba(0,255,178,0.08)" },
  { id: "storage-a", label: "Storage A", x: 180, y: 20, w: 180, h: 120, color: "rgba(59,130,246,0.08)" },
  { id: "storage-b", label: "Storage B", x: 180, y: 160, w: 180, h: 120, color: "rgba(59,130,246,0.08)" },
  { id: "picking", label: "Picking", x: 380, y: 20, w: 140, h: 120, color: "rgba(255,184,0,0.08)" },
  { id: "shipping", label: "Shipping", x: 380, y: 160, w: 140, h: 120, color: "rgba(255,0,102,0.08)" },
  { id: "dock", label: "Dock", x: 20, y: 160, w: 140, h: 120, color: "rgba(255,184,0,0.08)" },
];

export const FleetMap: React.FC = () => {
  return (
    <div className="w-full aspect-[5/3]">
      <svg viewBox="0 0 540 300" className="w-full h-full">
        {/* Background */}
        <rect x="0" y="0" width="540" height="300" fill="#08070e" rx="8" />

        {/* Grid lines */}
        {Array.from({ length: 28 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={i * 20}
            y1="0"
            x2={i * 20}
            y2="300"
            stroke="rgba(95,95,113,0.08)"
            strokeWidth="0.5"
          />
        ))}
        {Array.from({ length: 16 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={i * 20}
            x2="540"
            y2={i * 20}
            stroke="rgba(95,95,113,0.08)"
            strokeWidth="0.5"
          />
        ))}

        {/* Zones */}
        {zones.map((zone) => (
          <g key={zone.id}>
            <rect
              x={zone.x}
              y={zone.y}
              width={zone.w}
              height={zone.h}
              fill={zone.color}
              stroke="rgba(95,95,113,0.22)"
              strokeWidth="1"
              rx="4"
            />
            <text
              x={zone.x + zone.w / 2}
              y={zone.y + 14}
              textAnchor="middle"
              fontSize="9"
              fill="rgba(161,161,170,0.6)"
              fontFamily="DM Sans"
            >
              {zone.label}
            </text>
          </g>
        ))}

        {/* Vehicles */}
        {mockVehicles.map((v) => (
          <g key={v.id}>
            <circle
              cx={v.x}
              cy={v.y}
              r="8"
              fill={
                v.status === "active"
                  ? "rgba(0,255,178,0.2)"
                  : v.status === "charging"
                  ? "rgba(59,130,246,0.2)"
                  : "rgba(113,113,122,0.2)"
              }
            />
            <circle
              cx={v.x}
              cy={v.y}
              r="4"
              fill={
                v.status === "active"
                  ? "#00ffb2"
                  : v.status === "charging"
                  ? "#3b82f6"
                  : "#71717a"
              }
            />
            <text
              x={v.x}
              y={v.y - 12}
              textAnchor="middle"
              fontSize="8"
              fill="#a1a1aa"
              fontFamily="DM Sans"
              fontWeight="500"
            >
              {v.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};
