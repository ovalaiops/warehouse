import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { StatCard } from "@/components/common/StatCard";
import { TrajectoryOverlay } from "@/components/fleet/TrajectoryOverlay";
import type { TrajectoryData } from "@/components/fleet/TrajectoryOverlay";
import { Truck, AlertTriangle, Gauge, MapPin } from "lucide-react";

interface VehicleInfo {
  id: string;
  identifier: string;
  type: "forklift" | "pallet_jack" | "agv";
  status: "active" | "idle" | "charging" | "maintenance";
  speed: number;
  zone: string;
  x: number;
  y: number;
}

const mockVehicles: VehicleInfo[] = [
  { id: "v1", identifier: "FL-01", type: "forklift", status: "active", speed: 6.2, zone: "Receiving", x: 120, y: 80 },
  { id: "v2", identifier: "FL-02", type: "forklift", status: "active", speed: 8.1, zone: "Storage A", x: 320, y: 100 },
  { id: "v3", identifier: "FL-03", type: "forklift", status: "idle", zone: "Storage B", speed: 0, x: 350, y: 250 },
  { id: "v4", identifier: "FL-04", type: "forklift", status: "active", speed: 4.5, zone: "Shipping", x: 580, y: 240 },
  { id: "v5", identifier: "PJ-01", type: "pallet_jack", status: "charging", speed: 0, zone: "Dock A", x: 60, y: 260 },
  { id: "v6", identifier: "PJ-02", type: "pallet_jack", status: "active", speed: 3.2, zone: "Picking", x: 570, y: 80 },
  { id: "v7", identifier: "AGV-01", type: "agv", status: "active", speed: 5.0, zone: "Main Corridor", x: 440, y: 175 },
  { id: "v8", identifier: "AGV-02", type: "agv", status: "maintenance", speed: 0, zone: "Maintenance", x: 800, y: 300 },
];

const mockTrajectories: TrajectoryData[] = [
  {
    vehicleId: "v1",
    label: "FL-01",
    color: "#00ffb2",
    points: [
      { x: 60, y: 100, timestamp: "14:28", speed: 5.1 },
      { x: 80, y: 90, timestamp: "14:29", speed: 5.8 },
      { x: 100, y: 85, timestamp: "14:30", speed: 6.0 },
      { x: 120, y: 80, timestamp: "14:31", speed: 6.2 },
    ],
  },
  {
    vehicleId: "v2",
    label: "FL-02",
    color: "#3b82f6",
    points: [
      { x: 280, y: 60, timestamp: "14:26", speed: 7.5 },
      { x: 290, y: 70, timestamp: "14:27", speed: 8.0 },
      { x: 300, y: 80, timestamp: "14:28", speed: 8.3 },
      { x: 310, y: 90, timestamp: "14:29", speed: 8.1 },
      { x: 320, y: 100, timestamp: "14:31", speed: 8.1 },
    ],
  },
  {
    vehicleId: "v4",
    label: "FL-04",
    color: "#ff0066",
    points: [
      { x: 540, y: 200, timestamp: "14:27", speed: 5.0 },
      { x: 550, y: 210, timestamp: "14:28", speed: 4.8 },
      { x: 560, y: 220, timestamp: "14:29", speed: 4.6 },
      { x: 570, y: 230, timestamp: "14:30", speed: 4.5 },
      { x: 580, y: 240, timestamp: "14:31", speed: 4.5 },
    ],
  },
  {
    vehicleId: "v7",
    label: "AGV-01",
    color: "#ffb800",
    points: [
      { x: 380, y: 175, timestamp: "14:28", speed: 5.0 },
      { x: 400, y: 175, timestamp: "14:29", speed: 5.0 },
      { x: 420, y: 175, timestamp: "14:30", speed: 5.0 },
      { x: 440, y: 175, timestamp: "14:31", speed: 5.0 },
    ],
  },
];

const statusColors: Record<string, string> = {
  active: "text-accent",
  idle: "text-text-muted",
  charging: "text-info",
  maintenance: "text-warning",
};

const statusBadgeVariant: Record<string, "success" | "info" | "warning" | "critical"> = {
  active: "success",
  idle: "info",
  charging: "info",
  maintenance: "warning",
};

const zones = [
  { id: "receiving", label: "Receiving", x: 20, y: 20, w: 200, h: 150, color: "rgba(0,255,178,0.06)", stroke: "rgba(0,255,178,0.2)" },
  { id: "storage-a", label: "Storage A", x: 240, y: 20, w: 250, h: 150, color: "rgba(59,130,246,0.06)", stroke: "rgba(59,130,246,0.2)" },
  { id: "storage-b", label: "Storage B", x: 240, y: 190, w: 250, h: 150, color: "rgba(59,130,246,0.06)", stroke: "rgba(59,130,246,0.2)" },
  { id: "picking", label: "Picking", x: 510, y: 20, w: 200, h: 150, color: "rgba(255,184,0,0.06)", stroke: "rgba(255,184,0,0.2)" },
  { id: "shipping", label: "Shipping", x: 510, y: 190, w: 200, h: 150, color: "rgba(255,0,102,0.06)", stroke: "rgba(255,0,102,0.2)" },
  { id: "dock-a", label: "Dock A", x: 20, y: 190, w: 95, h: 150, color: "rgba(255,184,0,0.06)", stroke: "rgba(255,184,0,0.2)" },
  { id: "dock-b", label: "Dock B", x: 125, y: 190, w: 95, h: 150, color: "rgba(255,184,0,0.06)", stroke: "rgba(255,184,0,0.2)" },
  { id: "cold", label: "Cold Storage", x: 730, y: 20, w: 150, h: 320, color: "rgba(139,92,246,0.06)", stroke: "rgba(139,92,246,0.2)" },
];

const Fleet: React.FC = () => {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  const activeCount = mockVehicles.filter((v) => v.status === "active").length;
  const selectedTrajectories = selectedVehicle
    ? mockTrajectories.filter((t) => t.vehicleId === selectedVehicle)
    : mockTrajectories;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Fleet Tracking</h1>
        <p className="text-sm text-text-muted mt-1">
          Real-time vehicle positions and trajectory analysis
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Truck} label="Total Vehicles" value={mockVehicles.length} />
        <StatCard icon={Gauge} label="Active" value={activeCount} accentHighlight />
        <StatCard icon={AlertTriangle} label="Near-Miss Events" value={3} trend={{ value: 12, direction: "up" }} />
        <StatCard icon={MapPin} label="Avg Speed" value="5.8 km/h" />
      </div>

      <div className="flex gap-4">
        {/* Map with trajectories */}
        <div className="flex-1">
          <Card header={{ title: "Fleet Map" }} padding="sm">
            <div className="relative bg-background rounded-button overflow-hidden">
              <svg viewBox="0 0 900 360" className="w-full">
                {/* Grid */}
                {Array.from({ length: 46 }).map((_, i) => (
                  <line key={`v-${i}`} x1={i * 20} y1="0" x2={i * 20} y2="360" stroke="rgba(95,95,113,0.06)" strokeWidth="0.5" />
                ))}
                {Array.from({ length: 19 }).map((_, i) => (
                  <line key={`h-${i}`} x1="0" y1={i * 20} x2="900" y2={i * 20} stroke="rgba(95,95,113,0.06)" strokeWidth="0.5" />
                ))}

                {/* Zones */}
                {zones.map((z) => (
                  <g key={z.id}>
                    <rect x={z.x} y={z.y} width={z.w} height={z.h} fill={z.color} stroke={z.stroke} strokeWidth="1" rx="4" />
                    <text x={z.x + z.w / 2} y={z.y + 14} textAnchor="middle" fontSize="9" fill="rgba(161,161,170,0.5)" fontFamily="DM Sans">{z.label}</text>
                  </g>
                ))}

                {/* Vehicles */}
                {mockVehicles.map((v) => {
                  const isSelected = selectedVehicle === v.id;
                  const color = v.status === "active" ? "#00ffb2" : v.status === "charging" ? "#3b82f6" : v.status === "maintenance" ? "#ffb800" : "#71717a";
                  return (
                    <g key={v.id} className="cursor-pointer" onClick={() => setSelectedVehicle(isSelected ? null : v.id)}>
                      {isSelected && <circle cx={v.x} cy={v.y} r="14" fill="none" stroke={color} strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />}
                      <circle cx={v.x} cy={v.y} r="8" fill={`${color}33`} />
                      <circle cx={v.x} cy={v.y} r="4" fill={color} />
                      <text x={v.x} y={v.y - 12} textAnchor="middle" fontSize="8" fill="#a1a1aa" fontFamily="DM Sans" fontWeight="500">{v.identifier}</text>
                    </g>
                  );
                })}
              </svg>

              {/* Trajectory overlay */}
              <TrajectoryOverlay trajectories={selectedTrajectories} />
            </div>
          </Card>
        </div>

        {/* Vehicle list sidebar */}
        <div className="w-72 flex-shrink-0">
          <Card header={{ title: "Vehicles" }} padding="none">
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
              {mockVehicles.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVehicle(selectedVehicle === v.id ? null : v.id)}
                  className={cn(
                    "flex items-start justify-between w-full px-4 py-3 border-b border-border last:border-b-0 text-left hover:bg-surface-elevated transition-colors",
                    selectedVehicle === v.id && "bg-accent/5"
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-semibold", statusColors[v.status])}>
                        {v.identifier}
                      </span>
                      <Badge variant={statusBadgeVariant[v.status]}>
                        {v.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-muted mt-1 capitalize">{v.type.replace("_", " ")}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-text-muted">{v.zone}</span>
                      {v.speed > 0 && (
                        <span className="text-xs text-text-secondary">{v.speed} km/h</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Near-miss counter */}
          <Card padding="md" className="mt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-critical/10 rounded-button">
                <AlertTriangle className="w-5 h-5 text-critical" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Near-Miss Events Today</p>
                <p className="text-2xl font-bold text-critical">3</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Fleet;
