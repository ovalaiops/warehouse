import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { formatTimestamp } from "@/lib/utils";
import { Badge } from "@/components/common/Badge";
import { AlertDetail } from "@/components/alerts/AlertDetail";
import { Search, Filter, X } from "lucide-react";
import type { Alert, AlertSeverity, AlertType, AlertStatus } from "@/types";

const severityVariant: Record<AlertSeverity, "critical" | "warning" | "info"> = {
  critical: "critical",
  warning: "warning",
  info: "info",
};

const statusColors: Record<AlertStatus, string> = {
  new: "text-accent",
  acknowledged: "text-warning",
  resolved: "text-text-muted",
  dismissed: "text-text-muted",
};

const mockAlerts: Alert[] = [
  {
    id: "a1", warehouseId: "wh-1", cameraId: "cam-3", zoneId: "z-2",
    type: "safety", subtype: "no_hard_hat", severity: "critical", status: "new",
    title: "Worker without hard hat in Zone B",
    description: "Camera 3 detected a worker in the loading dock area without required PPE.",
    reasoning: "The Cosmos Reason model detected a person-shaped object in the loading dock zone. Head region analysis shows no hard hat detected with 94% confidence. Zone B is classified as a mandatory PPE area.",
    detections: [{ label: "person_no_hardhat", bbox: [120, 80, 280, 350], confidence: 0.94 }],
    metadata: { zone: "Loading Dock B" },
    detectedAt: new Date(Date.now() - 120000).toISOString(),
    createdAt: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: "a2", warehouseId: "wh-1", cameraId: "cam-7", zoneId: "z-4",
    type: "safety", subtype: "near_miss", severity: "critical", status: "new",
    title: "Near-miss: Forklift and pedestrian intersection",
    description: "Forklift FL-04 came within 1.2m of pedestrian at aisle intersection A4/B2.",
    reasoning: "Trajectory analysis shows converging paths between FL-04 and an unidentified pedestrian. Closest approach was 1.2m at 14:32:15. Safety threshold is 2.0m.",
    detections: [{ label: "forklift", bbox: [50, 100, 200, 300], confidence: 0.97 }, { label: "person", bbox: [220, 120, 300, 350], confidence: 0.93 }],
    metadata: { vehicleId: "FL-04", distance: "1.2m" },
    detectedAt: new Date(Date.now() - 300000).toISOString(),
    createdAt: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: "a3", warehouseId: "wh-1", cameraId: "cam-2",
    type: "inventory", subtype: "misplaced_item", severity: "warning", status: "acknowledged",
    title: "Inventory anomaly: Misplaced pallet in A3-B2-L1",
    description: "Expected empty position shows an unregistered pallet.",
    metadata: { position: "A3-B2-L1" },
    detectedAt: new Date(Date.now() - 600000).toISOString(),
    acknowledgedAt: new Date(Date.now() - 400000).toISOString(),
    createdAt: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: "a4", warehouseId: "wh-1", cameraId: "cam-5", zoneId: "z-1",
    type: "congestion", subtype: "zone_congestion", severity: "warning", status: "new",
    title: "High traffic density in Receiving Zone",
    description: "3 forklifts and 5 workers detected simultaneously in receiving zone.",
    metadata: { vehicles: 3, workers: 5 },
    detectedAt: new Date(Date.now() - 900000).toISOString(),
    createdAt: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: "a5", warehouseId: "wh-1", cameraId: "cam-1",
    type: "security", subtype: "restricted_access", severity: "info", status: "new",
    title: "Access to restricted zone detected",
    description: "Motion detected in restricted storage area C after hours.",
    metadata: {},
    detectedAt: new Date(Date.now() - 1800000).toISOString(),
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "a6", warehouseId: "wh-1", cameraId: "cam-4",
    type: "safety", subtype: "spill_detected", severity: "warning", status: "resolved",
    title: "Liquid spill detected in Aisle B7",
    description: "Camera 4 detected a liquid spill near position B7-L1. Area marked for cleanup.",
    metadata: { aisle: "B7" },
    detectedAt: new Date(Date.now() - 3600000).toISOString(),
    resolvedAt: new Date(Date.now() - 2400000).toISOString(),
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "a7", warehouseId: "wh-1", cameraId: "cam-6",
    type: "quality", subtype: "damaged_package", severity: "info", status: "dismissed",
    title: "Possible damaged package on conveyor belt",
    description: "AI detected irregular package shape on conveyor C2. May indicate damage.",
    metadata: {},
    detectedAt: new Date(Date.now() - 7200000).toISOString(),
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

const Alerts: React.FC = () => {
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | "all">("all");
  const [filterType, setFilterType] = useState<AlertType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<AlertStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAlerts = mockAlerts.filter((a) => {
    if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
    if (filterType !== "all" && a.type !== filterType) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (searchQuery && !a.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Alerts</h1>
          <p className="text-sm text-text-muted mt-1">
            {mockAlerts.length} total alerts, {mockAlerts.filter((a) => a.status === "new").length} unresolved
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search alerts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-button text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as AlertSeverity | "all")}
            className="bg-surface border border-border rounded-button px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/40"
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as AlertType | "all")}
            className="bg-surface border border-border rounded-button px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/40"
          >
            <option value="all">All Types</option>
            <option value="safety">Safety</option>
            <option value="inventory">Inventory</option>
            <option value="congestion">Congestion</option>
            <option value="security">Security</option>
            <option value="quality">Quality</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as AlertStatus | "all")}
            className="bg-surface border border-border rounded-button px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/40"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      {/* Content area */}
      <div className="flex gap-4">
        {/* Alerts list */}
        <div className={cn("flex-1 space-y-1", selectedAlert && "max-w-[55%]")}>
          <div className="bg-surface border border-border rounded-card overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[80px_100px_1fr_100px_100px_80px] gap-2 px-4 py-3 border-b border-border text-xs font-semibold text-text-muted uppercase tracking-wider">
              <span>Severity</span>
              <span>Type</span>
              <span>Title</span>
              <span>Zone</span>
              <span>Time</span>
              <span>Status</span>
            </div>

            {/* Rows */}
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className={cn(
                  "grid grid-cols-[80px_100px_1fr_100px_100px_80px] gap-2 px-4 py-3 border-b border-border last:border-b-0 cursor-pointer transition-colors hover:bg-surface-elevated",
                  selectedAlert?.id === alert.id && "bg-accent/5"
                )}
              >
                <div>
                  <Badge variant={severityVariant[alert.severity]} dot>
                    {alert.severity}
                  </Badge>
                </div>
                <span className="text-xs text-text-secondary capitalize">
                  {alert.type}
                </span>
                <span className="text-sm text-text-primary truncate">
                  {alert.title}
                </span>
                <span className="text-xs text-text-muted">
                  {(alert.metadata.zone as string) || alert.zoneId || "-"}
                </span>
                <span className="text-xs text-text-muted">
                  {formatTimestamp(alert.detectedAt)}
                </span>
                <span className={cn("text-xs font-medium capitalize", statusColors[alert.status])}>
                  {alert.status}
                </span>
              </div>
            ))}

            {filteredAlerts.length === 0 && (
              <div className="px-4 py-12 text-center text-sm text-text-muted">
                No alerts match your filters
              </div>
            )}
          </div>
        </div>

        {/* Detail side panel */}
        {selectedAlert && (
          <div className="w-[45%] bg-surface border border-border rounded-card p-4 overflow-y-auto max-h-[calc(100vh-200px)] sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
                Alert Details
              </h3>
              <button
                onClick={() => setSelectedAlert(null)}
                className="p-1 rounded-button text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <AlertDetail
              alert={selectedAlert}
              onAcknowledge={() => setSelectedAlert(null)}
              onResolve={() => setSelectedAlert(null)}
              onDismiss={() => setSelectedAlert(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Alerts;
