import React, { useState } from "react";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { FloorMap } from "@/components/warehouse/FloorMap";
import { MapPin, Users, Truck, AlertTriangle } from "lucide-react";

interface ZoneDetail {
  id: string;
  name: string;
  type: string;
  workers: number;
  vehicles: number;
  alerts: number;
  capacity: string;
}

const zoneDetails: Record<string, ZoneDetail> = {
  "z-1": { id: "z-1", name: "Receiving", type: "receiving", workers: 5, vehicles: 2, alerts: 1, capacity: "72%" },
  "z-2": { id: "z-2", name: "Storage A", type: "storage", workers: 3, vehicles: 1, alerts: 0, capacity: "85%" },
  "z-3": { id: "z-3", name: "Storage B", type: "storage", workers: 4, vehicles: 2, alerts: 1, capacity: "91%" },
  "z-4": { id: "z-4", name: "Picking", type: "picking", workers: 8, vehicles: 0, alerts: 0, capacity: "65%" },
  "z-5": { id: "z-5", name: "Shipping", type: "shipping", workers: 6, vehicles: 3, alerts: 2, capacity: "78%" },
  "z-6": { id: "z-6", name: "Dock A", type: "dock", workers: 2, vehicles: 1, alerts: 0, capacity: "50%" },
  "z-7": { id: "z-7", name: "Dock B", type: "dock", workers: 3, vehicles: 1, alerts: 1, capacity: "60%" },
  "z-8": { id: "z-8", name: "Cold Storage", type: "restricted", workers: 1, vehicles: 0, alerts: 0, capacity: "45%" },
};

const Warehouse: React.FC = () => {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const zone = selectedZone ? zoneDetails[selectedZone] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary font-display">Warehouse Map</h1>
        <p className="text-sm text-text-muted mt-1">
          Interactive floor plan with real-time data overlays
        </p>
      </div>

      <div className="flex gap-4">
        {/* Map */}
        <div className="flex-1">
          <Card padding="md">
            <FloorMap onZoneClick={setSelectedZone} />
          </Card>
        </div>

        {/* Zone sidebar */}
        <div className="w-72 space-y-4 flex-shrink-0">
          <Card header={{ title: "Zones" }} padding="none">
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
              {Object.values(zoneDetails).map((z) => (
                <button
                  key={z.id}
                  onClick={() => setSelectedZone(z.id)}
                  className={`flex items-center justify-between w-full px-4 py-3 border-b border-border last:border-b-0 text-left hover:bg-surface-elevated transition-colors ${
                    selectedZone === z.id ? "bg-accent/5" : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{z.name}</p>
                    <p className="text-xs text-text-muted capitalize">{z.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {z.alerts > 0 && (
                      <Badge variant="critical">{z.alerts}</Badge>
                    )}
                    <span className="text-xs text-text-muted">{z.capacity}</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Zone detail */}
          {zone && (
            <Card header={{ title: zone.name }} padding="md">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <MapPin className="w-4 h-4 text-text-muted" />
                    Type
                  </div>
                  <Badge variant="info">{zone.type}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Users className="w-4 h-4 text-text-muted" />
                    Workers
                  </div>
                  <span className="text-sm font-medium text-text-primary">{zone.workers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Truck className="w-4 h-4 text-text-muted" />
                    Vehicles
                  </div>
                  <span className="text-sm font-medium text-text-primary">{zone.vehicles}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <AlertTriangle className="w-4 h-4 text-text-muted" />
                    Active Alerts
                  </div>
                  <span className="text-sm font-medium text-text-primary">{zone.alerts}</span>
                </div>

                {/* Capacity bar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-muted">Capacity</span>
                    <span className="text-xs font-medium text-text-primary">{zone.capacity}</span>
                  </div>
                  <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{ width: zone.capacity }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Warehouse;
