import React, { useState } from "react";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";
import {
  FileText,
  Download,
  Plus,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Package,
  ChevronRight,
} from "lucide-react";

interface Report {
  id: string;
  title: string;
  shiftStart: string;
  shiftEnd: string;
  generatedAt: string;
  status: "completed" | "generating" | "failed";
  metrics: {
    alertCount: number;
    safetyEvents: number;
    inventoryAnomalies: number;
    operationalTempo: "high" | "medium" | "low";
    safetyScore: number;
    throughput: number;
  };
  keyEvents: string[];
}

const mockReports: Report[] = [
  {
    id: "r1",
    title: "Morning Shift Report",
    shiftStart: "2026-03-05T06:00:00Z",
    shiftEnd: "2026-03-05T14:00:00Z",
    generatedAt: "2026-03-05T14:15:00Z",
    status: "completed",
    metrics: {
      alertCount: 12,
      safetyEvents: 3,
      inventoryAnomalies: 4,
      operationalTempo: "high",
      safetyScore: 94.2,
      throughput: 1247,
    },
    keyEvents: [
      "Near-miss incident between FL-04 and pedestrian at intersection A4/B2 (14:32)",
      "PPE violation detected in Zone B - worker without hard hat (09:15)",
      "Inventory anomaly: 4 misplaced pallets identified during scan cycle",
      "Peak traffic density in receiving zone exceeded threshold (10:30-11:15)",
    ],
  },
  {
    id: "r2",
    title: "Night Shift Report",
    shiftStart: "2026-03-04T22:00:00Z",
    shiftEnd: "2026-03-05T06:00:00Z",
    generatedAt: "2026-03-05T06:10:00Z",
    status: "completed",
    metrics: {
      alertCount: 5,
      safetyEvents: 1,
      inventoryAnomalies: 2,
      operationalTempo: "low",
      safetyScore: 98.5,
      throughput: 432,
    },
    keyEvents: [
      "Restricted area access detected in Cold Storage C (02:15) - authorized maintenance",
      "AGV-01 routing error corrected automatically near zone boundary",
      "2 inventory positions flagged for morning verification",
    ],
  },
  {
    id: "r3",
    title: "Afternoon Shift Report",
    shiftStart: "2026-03-04T14:00:00Z",
    shiftEnd: "2026-03-04T22:00:00Z",
    generatedAt: "2026-03-04T22:12:00Z",
    status: "completed",
    metrics: {
      alertCount: 8,
      safetyEvents: 2,
      inventoryAnomalies: 3,
      operationalTempo: "medium",
      safetyScore: 96.1,
      throughput: 893,
    },
    keyEvents: [
      "Spill detected and resolved in Aisle B7 (15:45-16:20)",
      "FL-02 speed violation in storage zone (17:30)",
      "3 inventory anomalies detected during afternoon scan",
    ],
  },
  {
    id: "r4",
    title: "Weekly Summary Report",
    shiftStart: "2026-02-24T00:00:00Z",
    shiftEnd: "2026-03-02T23:59:00Z",
    generatedAt: "2026-03-03T01:00:00Z",
    status: "completed",
    metrics: {
      alertCount: 67,
      safetyEvents: 12,
      inventoryAnomalies: 18,
      operationalTempo: "medium",
      safetyScore: 95.7,
      throughput: 8934,
    },
    keyEvents: [
      "Total 67 alerts across all shifts (down 8% from previous week)",
      "Safety score averaged 95.7% (target: 95%)",
      "12 safety events, 3 near-miss incidents (all resolved)",
      "Inventory accuracy maintained at 99.1%",
    ],
  },
];

const tempoColors: Record<string, "success" | "warning" | "critical"> = {
  high: "critical",
  medium: "warning",
  low: "success",
};

const Reports: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary font-display">Reports</h1>
          <p className="text-sm text-text-muted mt-1">
            Automated shift reports and operational summaries
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setShowGenerate(true)}>
          <Plus className="w-4 h-4" />
          Generate Report
        </Button>
      </div>

      <div className="flex gap-4">
        {/* Report list */}
        <div className="flex-1">
          <Card padding="none">
            {mockReports.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className={`flex items-center justify-between w-full px-5 py-4 border-b border-border last:border-b-0 text-left hover:bg-surface-elevated transition-colors ${
                  selectedReport?.id === report.id ? "bg-accent/5" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-surface-elevated rounded-button">
                    <FileText className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {report.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-xs text-text-muted">
                        <Clock className="w-3 h-3" />
                        {new Date(report.generatedAt).toLocaleDateString()}
                      </div>
                      <Badge variant={tempoColors[report.metrics.operationalTempo]}>
                        {report.metrics.operationalTempo} tempo
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-text-primary">
                      {report.metrics.alertCount} alerts
                    </p>
                    <p className="text-xs text-text-muted">
                      Score: {report.metrics.safetyScore}%
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </div>
              </button>
            ))}
          </Card>
        </div>

        {/* Report detail */}
        {selectedReport && (
          <div className="w-[45%]">
            <Card padding="md">
              <div className="space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary font-display">
                      {selectedReport.title}
                    </h2>
                    <p className="text-xs text-text-muted mt-1">
                      {new Date(selectedReport.shiftStart).toLocaleString()} -{" "}
                      {new Date(selectedReport.shiftEnd).toLocaleString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-surface-elevated rounded-button">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheck className="w-4 h-4 text-accent" />
                      <span className="text-xs text-text-muted">Safety Score</span>
                    </div>
                    <p className="text-xl font-bold text-accent">
                      {selectedReport.metrics.safetyScore}%
                    </p>
                  </div>
                  <div className="p-3 bg-surface-elevated rounded-button">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-critical" />
                      <span className="text-xs text-text-muted">Safety Events</span>
                    </div>
                    <p className="text-xl font-bold text-critical">
                      {selectedReport.metrics.safetyEvents}
                    </p>
                  </div>
                  <div className="p-3 bg-surface-elevated rounded-button">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="w-4 h-4 text-warning" />
                      <span className="text-xs text-text-muted">Anomalies</span>
                    </div>
                    <p className="text-xl font-bold text-warning">
                      {selectedReport.metrics.inventoryAnomalies}
                    </p>
                  </div>
                  <div className="p-3 bg-surface-elevated rounded-button">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-info" />
                      <span className="text-xs text-text-muted">Throughput</span>
                    </div>
                    <p className="text-xl font-bold text-text-primary">
                      {selectedReport.metrics.throughput.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Key events */}
                <div>
                  <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                    Key Events
                  </h4>
                  <div className="space-y-2">
                    {selectedReport.keyEvents.map((event, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 p-2 bg-background rounded-button"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                        <p className="text-sm text-text-secondary">{event}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Generate report modal */}
      <Modal
        open={showGenerate}
        onClose={() => setShowGenerate(false)}
        title="Generate New Report"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowGenerate(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowGenerate(false)}>
              Generate
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Report Type
            </label>
            <select className="w-full bg-surface-elevated border border-border rounded-button px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/40">
              <option>Shift Report</option>
              <option>Daily Summary</option>
              <option>Weekly Summary</option>
              <option>Custom Range</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Start
              </label>
              <input
                type="datetime-local"
                className="w-full bg-surface-elevated border border-border rounded-button px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                End
              </label>
              <input
                type="datetime-local"
                className="w-full bg-surface-elevated border border-border rounded-button px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/40"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Reports;
