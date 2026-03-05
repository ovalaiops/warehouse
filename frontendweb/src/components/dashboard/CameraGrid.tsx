import React from "react";
import { cn } from "@/lib/utils";
import { Camera, Maximize2 } from "lucide-react";

interface CameraFeed {
  id: string;
  name: string;
  zone: string;
  status: "active" | "inactive" | "error";
  thumbnail: string;
}

const mockCameras: CameraFeed[] = [
  { id: "cam-1", name: "Dock Entry A", zone: "Receiving", status: "active", thumbnail: "" },
  { id: "cam-2", name: "Aisle A3-A4", zone: "Storage", status: "active", thumbnail: "" },
  { id: "cam-3", name: "Loading Dock B", zone: "Shipping", status: "active", thumbnail: "" },
  { id: "cam-4", name: "Cold Storage C", zone: "Cold Zone", status: "active", thumbnail: "" },
  { id: "cam-5", name: "Picking Area 1", zone: "Picking", status: "active", thumbnail: "" },
  { id: "cam-6", name: "Main Corridor", zone: "General", status: "inactive", thumbnail: "" },
];

interface CameraGridProps {
  columns?: 2 | 3;
  onCameraClick?: (id: string) => void;
}

export const CameraGrid: React.FC<CameraGridProps> = ({
  columns = 2,
  onCameraClick,
}) => {
  const displayCameras = columns === 2 ? mockCameras.slice(0, 4) : mockCameras;

  return (
    <div
      className={cn(
        "grid gap-2",
        columns === 2 ? "grid-cols-2" : "grid-cols-3"
      )}
    >
      {displayCameras.map((cam) => (
        <div
          key={cam.id}
          className="relative group bg-background rounded-button overflow-hidden aspect-video cursor-pointer border border-border hover:border-accent/30 transition-all"
          onClick={() => onCameraClick?.(cam.id)}
        >
          {/* Simulated camera feed with gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-surface-elevated to-background flex items-center justify-center">
            <Camera className="w-8 h-8 text-text-muted/30" />
          </div>

          {/* Scan lines effect */}
          <div className="absolute inset-0 opacity-10">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-full h-px bg-accent/20"
                style={{ marginTop: `${i * 5}%` }}
              />
            ))}
          </div>

          {/* Status indicator */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                cam.status === "active"
                  ? "bg-accent shadow-[0_0_6px_rgba(0,255,178,0.6)]"
                  : cam.status === "error"
                  ? "bg-critical"
                  : "bg-text-muted"
              )}
            />
            <span className="text-[10px] font-medium text-text-secondary bg-background/60 px-1 rounded">
              {cam.status === "active" ? "LIVE" : "OFF"}
            </span>
          </div>

          {/* Expand icon on hover */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 className="w-3.5 h-3.5 text-accent" />
          </div>

          {/* Camera name overlay */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <p className="text-xs font-medium text-text-primary">{cam.name}</p>
            <p className="text-[10px] text-text-muted">{cam.zone}</p>
          </div>

          {/* Timestamp overlay */}
          <div className="absolute top-2 right-2 group-hover:hidden">
            <span className="text-[10px] text-text-muted bg-background/60 px-1 rounded font-mono">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
