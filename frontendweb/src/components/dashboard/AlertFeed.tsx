import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { formatTimestamp } from "@/lib/utils";
import { Badge } from "@/components/common/Badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Alert, AlertSeverity } from "@/types";

const severityBorderColor: Record<AlertSeverity, string> = {
  critical: "border-l-critical",
  warning: "border-l-warning",
  info: "border-l-info",
};

const severityVariant: Record<AlertSeverity, "critical" | "warning" | "info"> = {
  critical: "critical",
  warning: "warning",
  info: "info",
};

const mockAlerts: Alert[] = [
  {
    id: "a1",
    warehouseId: "wh-1",
    cameraId: "cam-3",
    zoneId: "z-2",
    type: "safety",
    subtype: "no_hard_hat",
    severity: "critical",
    status: "new",
    title: "Worker without hard hat in Zone B",
    description: "Camera 3 detected a worker in the loading dock area without required PPE (hard hat). Worker appears to be operating near active forklift traffic.",
    reasoning: "The Cosmos Reason model detected a person-shaped object in the loading dock zone. Head region analysis shows no hard hat detected with 94% confidence. Zone B is classified as a mandatory PPE area.",
    detections: [{ label: "person_no_hardhat", bbox: [120, 80, 280, 350], confidence: 0.94 }],
    metadata: { zone: "Loading Dock B" },
    detectedAt: new Date(Date.now() - 120000).toISOString(),
    createdAt: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: "a2",
    warehouseId: "wh-1",
    cameraId: "cam-7",
    zoneId: "z-4",
    type: "safety",
    subtype: "near_miss",
    severity: "critical",
    status: "new",
    title: "Near-miss: Forklift and pedestrian intersection",
    description: "Forklift FL-04 came within 1.2m of pedestrian at aisle intersection A4/B2. Speed at time of event: 8.3 km/h.",
    metadata: { vehicleId: "FL-04", distance: "1.2m" },
    detectedAt: new Date(Date.now() - 300000).toISOString(),
    createdAt: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: "a3",
    warehouseId: "wh-1",
    cameraId: "cam-2",
    type: "inventory",
    subtype: "misplaced_item",
    severity: "warning",
    status: "acknowledged",
    title: "Inventory anomaly: Misplaced pallet in A3-B2-L1",
    description: "Expected empty position A3-B2-L1 shows an unregistered pallet. Item does not match inventory manifest.",
    metadata: { position: "A3-B2-L1" },
    detectedAt: new Date(Date.now() - 600000).toISOString(),
    acknowledgedAt: new Date(Date.now() - 400000).toISOString(),
    createdAt: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: "a4",
    warehouseId: "wh-1",
    cameraId: "cam-5",
    zoneId: "z-1",
    type: "congestion",
    subtype: "zone_congestion",
    severity: "warning",
    status: "new",
    title: "High traffic density in Receiving Zone",
    description: "3 forklifts and 5 workers detected in receiving zone simultaneously. Exceeds recommended capacity of 2 vehicles.",
    metadata: { vehicles: 3, workers: 5 },
    detectedAt: new Date(Date.now() - 900000).toISOString(),
    createdAt: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: "a5",
    warehouseId: "wh-1",
    cameraId: "cam-1",
    type: "security",
    subtype: "restricted_access",
    severity: "info",
    status: "new",
    title: "Access to restricted zone detected",
    description: "Motion detected in restricted storage area C after hours. Likely authorized maintenance crew based on scheduled work order.",
    metadata: {},
    detectedAt: new Date(Date.now() - 1800000).toISOString(),
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

export const AlertFeed: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {mockAlerts.map((alert) => {
        const isExpanded = expandedId === alert.id;
        return (
          <div
            key={alert.id}
            className={cn(
              "border-l-2 bg-surface-elevated rounded-r-button overflow-hidden transition-all cursor-pointer",
              severityBorderColor[alert.severity],
              isExpanded && "ring-1 ring-border"
            )}
            onClick={() => setExpandedId(isExpanded ? null : alert.id)}
          >
            <div className="flex items-start justify-between p-3 gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={severityVariant[alert.severity]} dot>
                    {alert.severity}
                  </Badge>
                  <span className="text-xs text-text-muted">
                    {alert.type}
                  </span>
                </div>
                <p className="text-sm font-medium text-text-primary truncate">
                  {alert.title}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {formatTimestamp(alert.detectedAt)}
                </p>
              </div>
              <div className="flex-shrink-0 mt-1">
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-text-muted" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="px-3 pb-3 pt-0 border-t border-border">
                <p className="text-sm text-text-secondary mt-2">
                  {alert.description}
                </p>
                {alert.reasoning && (
                  <div className="mt-2 p-2 bg-background rounded-button">
                    <p className="text-xs text-text-muted font-medium mb-1">
                      AI Reasoning
                    </p>
                    <p className="text-xs text-text-secondary">
                      {alert.reasoning}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
