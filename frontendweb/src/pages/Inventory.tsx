import React from "react";
import { StatCard } from "@/components/common/StatCard";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { AnomalyCard } from "@/components/inventory/AnomalyCard";
import type { AnomalyData } from "@/components/inventory/AnomalyCard";
import { Package, CheckCircle, XCircle, AlertTriangle, ScanLine } from "lucide-react";

const mockAnomalies: AnomalyData[] = [
  {
    id: "an-1",
    type: "misplaced",
    position: "Row 3, Bay 2",
    aisle: "A3",
    bay: "B2",
    level: "L1",
    description: "Pallet detected in position designated as empty. Item does not match inventory manifest. Possible mis-pick from adjacent bay.",
    recommendedAction: "Dispatch worker to verify and relocate pallet to correct position. Update WMS accordingly.",
    confidence: 0.92,
    detectedAt: new Date(Date.now() - 1200000).toISOString(),
  },
  {
    id: "an-2",
    type: "missing",
    position: "Row 7, Bay 4",
    aisle: "A7",
    bay: "B4",
    level: "L3",
    description: "Expected pallet (SKU: WH-8842) not found at designated position. Last scanned 4 hours ago.",
    recommendedAction: "Check recent picks for SKU WH-8842. Search adjacent positions for misplaced inventory.",
    confidence: 0.88,
    detectedAt: new Date(Date.now() - 2400000).toISOString(),
  },
  {
    id: "an-3",
    type: "overflow",
    position: "Row 1, Bay 6",
    aisle: "A1",
    bay: "B6",
    level: "L2",
    description: "Item extends beyond rack boundary by approximately 15cm. Risk of falling hazard when adjacent operations occur.",
    recommendedAction: "Reposition item within rack boundaries. Consider upsizing to a wider rack position.",
    confidence: 0.95,
    detectedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "an-4",
    type: "damaged",
    position: "Row 5, Bay 1",
    aisle: "A5",
    bay: "B1",
    level: "L1",
    description: "Packaging damage detected on top layer of pallet. Visible compression and tear marks suggest forklift contact.",
    recommendedAction: "Inspect items for damage. Move to quality hold area if contents are compromised.",
    confidence: 0.79,
    detectedAt: new Date(Date.now() - 5400000).toISOString(),
  },
  {
    id: "an-5",
    type: "misplaced",
    position: "Row 2, Bay 8",
    aisle: "A2",
    bay: "B8",
    level: "L2",
    description: "SKU mismatch detected. Position expected SKU WH-3301 but found SKU WH-5567. Both items are in the same product category.",
    recommendedAction: "Verify both positions A2-B8-L2 and the expected location of WH-5567. Swap if confirmed.",
    confidence: 0.91,
    detectedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "an-6",
    type: "missing",
    position: "Row 9, Bay 3",
    aisle: "A9",
    bay: "B3",
    level: "L1",
    description: "Position shows empty but WMS records indicate 2 pallets of SKU WH-1120. Last physical count was 3 days ago.",
    recommendedAction: "Initiate cycle count for aisle A9. Cross-reference with outbound shipment logs.",
    confidence: 0.86,
    detectedAt: new Date(Date.now() - 9000000).toISOString(),
  },
];

const Inventory: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary font-display">Inventory</h1>
          <p className="text-sm text-text-muted mt-1">
            AI-powered inventory monitoring and anomaly detection
          </p>
        </div>
        <Button variant="primary" size="md">
          <ScanLine className="w-4 h-4" />
          Trigger Scan
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Total Positions"
          value="2,847"
        />
        <StatCard
          icon={CheckCircle}
          label="Occupied"
          value="2,412"
          trend={{ value: 1.2, direction: "up" }}
        />
        <StatCard
          icon={XCircle}
          label="Empty"
          value="435"
        />
        <StatCard
          icon={AlertTriangle}
          label="Anomalies"
          value={mockAnomalies.length}
          trend={{ value: 8.5, direction: "up" }}
          accentHighlight
        />
      </div>

      {/* Anomaly list */}
      <Card
        header={{
          title: "Detected Anomalies",
          action: (
            <span className="text-xs text-text-muted">
              Last scan: 12 min ago
            </span>
          ),
        }}
        padding="md"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {mockAnomalies.map((anomaly) => (
            <AnomalyCard key={anomaly.id} anomaly={anomaly} />
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Inventory;
