import React from "react";

interface TrajectoryPoint {
  x: number;
  y: number;
  timestamp: string;
  speed?: number;
}

interface TrajectoryData {
  vehicleId: string;
  label: string;
  color: string;
  points: TrajectoryPoint[];
}

interface TrajectoryOverlayProps {
  trajectories: TrajectoryData[];
  width?: number;
  height?: number;
  showTimestamps?: boolean;
  showSpeedIndicators?: boolean;
}

export const TrajectoryOverlay: React.FC<TrajectoryOverlayProps> = ({
  trajectories,
  width = 900,
  height = 360,
  showTimestamps = true,
  showSpeedIndicators = true,
}) => {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0 w-full h-full pointer-events-none"
    >
      <defs>
        {trajectories.map((traj) => (
          <linearGradient
            key={`grad-${traj.vehicleId}`}
            id={`grad-${traj.vehicleId}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor={traj.color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={traj.color} stopOpacity="1" />
          </linearGradient>
        ))}
      </defs>

      {trajectories.map((traj) => {
        if (traj.points.length < 2) return null;

        const pathData = traj.points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
          .join(" ");

        return (
          <g key={traj.vehicleId}>
            {/* Trail shadow */}
            <path
              d={pathData}
              fill="none"
              stroke={traj.color}
              strokeWidth="4"
              opacity="0.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Main path */}
            <path
              d={pathData}
              fill="none"
              stroke={`url(#grad-${traj.vehicleId})`}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points along path */}
            {traj.points.map((p, i) => {
              const isLast = i === traj.points.length - 1;
              const opacity = 0.3 + (i / traj.points.length) * 0.7;

              return (
                <g key={i}>
                  {/* Point marker */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isLast ? 5 : 2.5}
                    fill={traj.color}
                    opacity={opacity}
                  />
                  {isLast && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="9"
                      fill="none"
                      stroke={traj.color}
                      strokeWidth="1.5"
                      opacity="0.4"
                    />
                  )}

                  {/* Timestamp markers (show every 3rd point) */}
                  {showTimestamps && i % 3 === 0 && !isLast && (
                    <text
                      x={p.x}
                      y={p.y - 8}
                      textAnchor="middle"
                      fontSize="7"
                      fill={traj.color}
                      opacity="0.5"
                      fontFamily="DM Sans"
                    >
                      {p.timestamp}
                    </text>
                  )}

                  {/* Speed indicator */}
                  {showSpeedIndicators && p.speed && isLast && (
                    <g>
                      <rect
                        x={p.x + 10}
                        y={p.y - 10}
                        width="42"
                        height="16"
                        rx="3"
                        fill="#17171d"
                        stroke={traj.color}
                        strokeWidth="0.5"
                        opacity="0.9"
                      />
                      <text
                        x={p.x + 31}
                        y={p.y + 1}
                        textAnchor="middle"
                        fontSize="8"
                        fill={traj.color}
                        fontFamily="DM Sans"
                        fontWeight="600"
                      >
                        {p.speed.toFixed(1)} km/h
                      </text>
                    </g>
                  )}

                  {/* Vehicle label at last point */}
                  {isLast && (
                    <text
                      x={p.x}
                      y={p.y + 18}
                      textAnchor="middle"
                      fontSize="9"
                      fill={traj.color}
                      fontFamily="DM Sans"
                      fontWeight="600"
                    >
                      {traj.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
};

export type { TrajectoryData, TrajectoryPoint };
