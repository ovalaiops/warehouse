import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Camera, Circle, Brain, Loader2, Upload, ShieldCheck, Package, Eye } from "lucide-react";
import type { Detection } from "@/types";

interface CameraPlayerProps {
  cameraId: string;
  cameraName: string;
  zone?: string;
  detections?: Detection[];
  trajectories?: Array<{ points: [number, number][]; color: string; label: string }>;
  className?: string;
}

const mockDetections: Detection[] = [
  { label: "forklift", bbox: [80, 120, 220, 300], confidence: 0.97 },
  { label: "person", bbox: [300, 100, 380, 340], confidence: 0.95 },
  { label: "pallet", bbox: [420, 200, 540, 320], confidence: 0.89 },
];

const mockTrajectories = [
  {
    points: [[100, 250], [150, 230], [200, 210], [260, 200], [320, 195]] as [number, number][],
    color: "#00ffb2",
    label: "FL-01",
  },
  {
    points: [[350, 150], [340, 180], [330, 220], [325, 260]] as [number, number][],
    color: "#3b82f6",
    label: "Worker-3",
  },
];

type AnalysisMode = "safety" | "inventory" | "fleet";

interface AnalysisResult {
  status: string;
  model: string;
  reasoning: string;
  detections: Detection[];
  processing_time_ms: number;
  raw_output: string;
  // Safety-specific
  violations?: Array<{ type: string; severity: string; description: string; bbox?: number[] }>;
  safety_score?: number;
  // Inventory-specific
  items?: Array<{ label: string; count: number; bbox?: number[] }>;
  anomalies?: Array<{ type: string; description: string; bbox?: number[] }>;
}

export const CameraPlayer: React.FC<CameraPlayerProps> = ({
  cameraName,
  zone,
  detections: propDetections,
  trajectories = mockTrajectories,
  className,
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("safety");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const detections = analysisResult?.detections?.length
    ? analysisResult.detections
    : propDetections ?? mockDetections;

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setUploadedImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const formData = new FormData();

      if (uploadedFile) {
        formData.append("file", uploadedFile);
      } else {
        // Create a tiny placeholder image for demo mode
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/png")
        );
        formData.append("file", blob, "frame.png");
      }

      const res = await fetch(`/infer/${analysisMode}`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data);
      }
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setAnalyzing(false);
    }
  }, [analysisMode, uploadedFile]);

  const analysisModes: { mode: AnalysisMode; label: string; icon: React.ReactNode }[] = [
    { mode: "safety", label: "Safety", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { mode: "inventory", label: "Inventory", icon: <Package className="w-3.5 h-3.5" /> },
    { mode: "fleet", label: "Fleet", icon: <Eye className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex gap-4">
        {/* Video player with overlays */}
        <div className="flex-1 relative bg-background rounded-card overflow-hidden border border-border">
          <div className="aspect-video relative">
            {/* Simulated video feed or uploaded image */}
            {uploadedImage ? (
              <img
                src={uploadedImage}
                alt="Uploaded frame"
                className="absolute inset-0 w-full h-full object-contain bg-black"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-surface-elevated via-background to-surface flex items-center justify-center">
                <Camera className="w-16 h-16 text-text-muted/10" />
              </div>
            )}

            {/* Scan lines */}
            {!uploadedImage && (
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-full h-px bg-white"
                    style={{ marginTop: `${i * 2.5}%` }}
                  />
                ))}
              </div>
            )}

            {/* Bounding boxes */}
            {detections.map((det, i) => {
              if (!det.bbox) return null;
              const [x1, y1, x2, y2] = det.bbox;
              const scaleX = 100 / 640;
              const scaleY = 100 / 480;
              const colors: Record<string, string> = {
                forklift: "#00ffb2",
                person: "#3b82f6",
                pallet: "#ffb800",
                person_no_hardhat: "#ff0066",
                worker_no_hardhat: "#ff0066",
                spill: "#ff0066",
                blocked_exit: "#ff0066",
              };
              const color = colors[det.label] || "#00ffb2";
              return (
                <div
                  key={i}
                  className="absolute border-2 rounded-sm"
                  style={{
                    left: `${x1 * scaleX}%`,
                    top: `${y1 * scaleY}%`,
                    width: `${(x2 - x1) * scaleX}%`,
                    height: `${(y2 - y1) * scaleY}%`,
                    borderColor: color,
                  }}
                >
                  <span
                    className="absolute -top-5 left-0 text-[10px] text-white px-1 rounded-sm whitespace-nowrap"
                    style={{ backgroundColor: color }}
                  >
                    {det.label} {det.confidence ? `${(det.confidence * 100).toFixed(0)}%` : ""}
                  </span>
                </div>
              );
            })}

            {/* Trajectory paths */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 640 480">
              {trajectories.map((traj, i) => (
                <g key={i}>
                  <polyline
                    points={traj.points.map((p) => p.join(",")).join(" ")}
                    fill="none"
                    stroke={traj.color}
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    opacity="0.7"
                  />
                  {traj.points.map((p, j) => (
                    <circle
                      key={j}
                      cx={p[0]}
                      cy={p[1]}
                      r="3"
                      fill={traj.color}
                      opacity={0.4 + (j / traj.points.length) * 0.6}
                    />
                  ))}
                </g>
              ))}
            </svg>

            {/* Live indicator */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/70 px-2 py-1 rounded-badge">
              <Circle className="w-2 h-2 fill-critical text-critical animate-pulse" />
              <span className="text-[10px] font-bold text-critical tracking-wider">LIVE</span>
            </div>

            {/* Camera info */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
              <p className="text-sm font-medium text-text-primary">{cameraName}</p>
              {zone && <p className="text-xs text-text-muted">{zone}</p>}
            </div>

            {/* Timestamp */}
            <div className="absolute top-3 right-3">
              <span className="text-[10px] text-text-muted bg-background/70 px-2 py-1 rounded-badge font-mono">
                {new Date().toLocaleTimeString()}
              </span>
            </div>

            {/* Analyzing overlay */}
            {analyzing && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-accent animate-spin" />
                  <span className="text-sm text-accent font-medium">Cosmos Reason 2 analyzing...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detection info panel */}
        <div className="w-72 space-y-3 flex-shrink-0">
          {/* AI Analysis Controls */}
          <div className="p-3 bg-surface border border-accent/20 rounded-card space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-accent" />
              <h4 className="text-xs font-semibold text-accent uppercase tracking-wider">
                Cosmos AI Analysis
              </h4>
            </div>

            {/* Mode selector */}
            <div className="flex gap-1">
              {analysisModes.map(({ mode, label, icon }) => (
                <button
                  key={mode}
                  onClick={() => setAnalysisMode(mode)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1.5 rounded-button text-xs font-medium transition-colors",
                    analysisMode === mode
                      ? "bg-accent/10 text-accent border border-accent/30"
                      : "text-text-muted hover:text-text-primary bg-surface-elevated"
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            {/* Upload frame */}
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-button cursor-pointer hover:border-accent/40 transition-colors">
              <Upload className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-xs text-text-secondary">
                {uploadedFile ? uploadedFile.name : "Upload frame image"}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Run button */}
            <Button
              variant="primary"
              size="sm"
              onClick={runAnalysis}
              loading={analyzing}
              className="w-full"
            >
              <Brain className="w-3.5 h-3.5 mr-1" />
              Run {analysisMode.charAt(0).toUpperCase() + analysisMode.slice(1)} Analysis
            </Button>

            {/* Result summary */}
            {analysisResult && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Model:</span>
                  <Badge variant="info">{analysisResult.model}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Time:</span>
                  <span className="text-text-secondary">{analysisResult.processing_time_ms.toFixed(0)}ms</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Status:</span>
                  <Badge variant={analysisResult.status === "success" ? "success" : "warning"}>
                    {analysisResult.status}
                  </Badge>
                </div>
                {analysisResult.safety_score !== undefined && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">Safety Score:</span>
                    <span className={cn(
                      "font-bold",
                      analysisResult.safety_score >= 80 ? "text-accent" :
                      analysisResult.safety_score >= 50 ? "text-warning" : "text-critical"
                    )}>
                      {analysisResult.safety_score}/100
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reasoning panel */}
          {analysisResult?.reasoning && (
            <div className="bg-surface border border-border rounded-card overflow-hidden">
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-accent uppercase tracking-wider hover:bg-surface-elevated transition-colors"
              >
                <span>Chain of Thought</span>
                <span className="text-text-muted">{showReasoning ? "−" : "+"}</span>
              </button>
              {showReasoning && (
                <div className="px-3 pb-3 border-l-2 border-accent/40 ml-3">
                  <p className="text-xs text-text-secondary font-mono whitespace-pre-wrap leading-relaxed">
                    {analysisResult.reasoning}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Detections list */}
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Active Detections ({detections.length})
          </h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {detections.map((det, i) => (
              <div
                key={i}
                className="p-2 bg-surface border border-border rounded-button"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-medium text-text-primary capitalize">
                    {det.label.replace(/_/g, " ")}
                  </span>
                  <Badge variant={det.label.includes("no_") ? "critical" : "success"}>
                    {det.confidence ? `${(det.confidence * 100).toFixed(0)}%` : "N/A"}
                  </Badge>
                </div>
                {det.bbox && (
                  <p className="text-[10px] text-text-muted font-mono">
                    [{det.bbox.join(", ")}]
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Tracked objects */}
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider pt-1">
            Tracked Objects
          </h4>
          {trajectories.map((traj, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-button"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: traj.color }}
              />
              <span className="text-sm text-text-primary">{traj.label}</span>
              <span className="text-xs text-text-muted ml-auto">
                {traj.points.length} pts
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Violations panel (shown after safety analysis) */}
      {analysisResult?.violations && analysisResult.violations.length > 0 && (
        <div className="bg-surface border border-critical/20 rounded-card p-4">
          <h4 className="text-sm font-semibold text-critical mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Safety Violations Detected ({analysisResult.violations.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {analysisResult.violations.map((v, i) => (
              <div key={i} className="p-3 bg-background rounded-button border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-text-primary capitalize">
                    {v.type.replace(/_/g, " ")}
                  </span>
                  <Badge variant={v.severity === "high" ? "critical" : "warning"}>
                    {v.severity}
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
