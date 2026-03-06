import React, { useState, useRef, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import {
  Brain,
  Upload,
  Play,
  Loader2,
  Eye,
  ShieldCheck,
  Package,
  Truck,
  Sparkles,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileImage,
  Clipboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalysisMode {
  key: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  description: string;
  defaultPrompt: string;
  model: string;
}

interface BBox {
  label: string;
  confidence: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface InferenceResult {
  think?: string;
  detections?: BBox[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODES: AnalysisMode[] = [
  {
    key: "safety",
    label: "Safety Detection",
    icon: ShieldCheck,
    description: "Detect safety violations, PPE, near-misses",
    defaultPrompt:
      "Analyze this warehouse image for safety violations. Identify any workers without PPE, unsafe forklift operations, blocked exits, or spill hazards. Return bounding boxes for each violation.",
    model: "Cosmos-Reason2-8B",
  },
  {
    key: "inventory",
    label: "Inventory Analysis",
    icon: Package,
    description: "Count items, detect anomalies, rack compliance",
    defaultPrompt:
      "Count all visible items on the shelves. Detect any empty positions or misplaced items. Return item counts and anomaly locations with bounding boxes.",
    model: "Cosmos-Reason2-8B",
  },
  {
    key: "product",
    label: "Product Recognition",
    icon: Eye,
    description: "Identify products, analyze ingredients",
    defaultPrompt:
      "Identify this product. Provide brand, name, category, and analyze visible ingredients. Flag any concerning additives.",
    model: "Cosmos-Reason2-2B",
  },
  {
    key: "fleet",
    label: "Fleet Tracking",
    icon: Truck,
    description: "Track vehicles, detect trajectories",
    defaultPrompt:
      "Track all vehicles in this warehouse scene. Identify forklifts, AGVs, and pallet jacks. Provide bounding boxes and estimated trajectories.",
    model: "Cosmos-Reason2-8B",
  },
  {
    key: "quality",
    label: "Quality Inspection",
    icon: CheckCircle2,
    description: "Check packaging, labels, seals",
    defaultPrompt:
      "Inspect this package/product for quality issues. Check seal integrity, label alignment, and packaging condition.",
    model: "Cosmos-Reason2-2B",
  },
  {
    key: "caption",
    label: "Scene Captioning",
    icon: Sparkles,
    description: "General scene description",
    defaultPrompt:
      "Describe this warehouse scene in detail. Include information about activities, equipment, zones, and any notable observations.",
    model: "Cosmos-Reason2-2B",
  },
];

const SAMPLE_IMAGES = [
  { label: "Warehouse Floor", color: "#1a2e3a", mode: "safety" },
  { label: "Shelf View", color: "#2a1e3a", mode: "inventory" },
  { label: "Product Label", color: "#1a3a2e", mode: "product" },
  { label: "Loading Dock", color: "#3a2e1a", mode: "fleet" },
];

const BBOX_COLORS: Record<string, string> = {
  forklift: "#00ffb2",
  person: "#3b82f6",
  pallet: "#ffb800",
  violation: "#ff0066",
};

function getBBoxColor(label: string): string {
  const lower = label.toLowerCase();
  for (const [key, color] of Object.entries(BBOX_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return "#00ffb2";
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function runInference(
  mode: string,
  file: File,
  prompt: string
): Promise<InferenceResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (prompt) formData.append("prompt", prompt);

  const res = await fetch(`/infer/${mode}`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error(`Inference failed: ${res.status}`);
  return res.json();
}

async function checkModelHealth() {
  const res = await fetch("/models/health");
  if (!res.ok) return null;
  return res.json();
}

/** Create a tiny 1x1 PNG as a synthetic demo file */
function createDemoFile(label: string): File {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#17171d";
  ctx.fillRect(0, 0, 1, 1);
  const dataUrl = canvas.toDataURL("image/png");
  const byteString = atob(dataUrl.split(",")[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new File([ab], `${label.toLowerCase().replace(/\s/g, "_")}.png`, {
    type: "image/png",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CosmosAI: React.FC = () => {
  const [selectedMode, setSelectedMode] = useState<AnalysisMode>(MODES[0]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(MODES[0].defaultPrompt);
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Model health
  const { data: healthData } = useQuery({
    queryKey: ["model-health"],
    queryFn: checkModelHealth,
    refetchInterval: 30000,
  });

  // Revoke old object URLs
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Handle mode switch
  const handleModeChange = (mode: AnalysisMode) => {
    setSelectedMode(mode);
    setPrompt(mode.defaultPrompt);
  };

  // File handling
  const handleFile = useCallback((file: File) => {
    setUploadedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setProcessingTime(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // Clipboard paste
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) handleFile(file);
          break;
        }
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [handleFile]);

  // Run analysis
  const handleRunAnalysis = async () => {
    if (!uploadedFile) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setProcessingTime(null);
    const start = performance.now();
    try {
      const res = await runInference(selectedMode.key, uploadedFile, prompt);
      setProcessingTime(Math.round(performance.now() - start));
      setResult(res);
      if (res.think) setReasoningOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  // Sample images
  const handleSample = (sample: (typeof SAMPLE_IMAGES)[number]) => {
    const mode = MODES.find((m) => m.key === sample.mode) || MODES[0];
    handleModeChange(mode);
    const file = createDemoFile(sample.label);
    handleFile(file);
    // Auto-trigger after a tick so state settles
    setTimeout(async () => {
      setLoading(true);
      setError(null);
      setResult(null);
      const start = performance.now();
      try {
        const res = await runInference(mode.key, file, mode.defaultPrompt);
        setProcessingTime(Math.round(performance.now() - start));
        setResult(res);
        if (res.think) setReasoningOpen(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Analysis failed");
      } finally {
        setLoading(false);
      }
    }, 0);
  };

  // JSON syntax highlight (keys only)
  const renderJson = (obj: unknown) => {
    const raw = JSON.stringify(obj, null, 2);
    return raw.replace(
      /"([^"]+)":/g,
      '<span class="text-accent">"$1"</span>:'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <Brain className="w-7 h-7 text-accent" />
            Cosmos AI Lab
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Test NVIDIA Cosmos Reason 2 physical AI models
          </p>
        </div>
        <div className="flex items-center gap-2">
          {healthData ? (
            <Badge variant="success" dot>
              Models Online
            </Badge>
          ) : (
            <Badge variant="warning" dot>
              Checking Models...
            </Badge>
          )}
        </div>
      </div>

      {/* Mode Selector */}
      <Card padding="sm">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {MODES.map((mode) => {
            const active = selectedMode.key === mode.key;
            const Icon = mode.icon;
            return (
              <button
                key={mode.key}
                onClick={() => handleModeChange(mode)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-button text-sm font-medium whitespace-nowrap transition-all duration-200 border",
                  active
                    ? "bg-accent/10 text-accent border-accent/30"
                    : "bg-surface text-text-secondary border-transparent hover:bg-surface-elevated hover:text-text-primary"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-text-muted mt-2 px-1">
          {selectedMode.description}
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column: Upload + Prompt + Run */}
        <div className="space-y-4">
          {/* Upload Zone */}
          <Card header={{ title: "Image Input" }} padding="sm">
            <div
              ref={imageContainerRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-button border-2 border-dashed cursor-pointer transition-all duration-200 min-h-[280px] overflow-hidden",
                dragActive
                  ? "border-accent/60 bg-accent/5"
                  : "border-border hover:border-accent/40"
              )}
            >
              {previewUrl ? (
                <div className="relative w-full h-full min-h-[280px]">
                  <img
                    src={previewUrl}
                    alt="Uploaded"
                    className="w-full h-full object-contain max-h-[400px]"
                  />
                  {/* Bounding box overlay */}
                  {result?.detections &&
                    result.detections.map((det, i) => (
                      <div
                        key={i}
                        className="absolute border-2 rounded-sm pointer-events-none"
                        style={{
                          left: `${det.x}%`,
                          top: `${det.y}%`,
                          width: `${det.w}%`,
                          height: `${det.h}%`,
                          borderColor: getBBoxColor(det.label),
                        }}
                      >
                        <span
                          className="absolute -top-5 left-0 text-[10px] px-1 py-0.5 rounded font-mono whitespace-nowrap"
                          style={{
                            backgroundColor: getBBoxColor(det.label),
                            color: "#08070e",
                          }}
                        >
                          {det.label} {Math.round(det.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="w-16 h-16 rounded-card bg-surface-elevated flex items-center justify-center">
                    <Camera className="w-8 h-8 text-text-muted" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-text-secondary font-medium">
                      Drop an image here or click to browse
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      Supports PNG, JPG, WebP. You can also paste from
                      clipboard.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-text-muted">
                    <Upload className="w-4 h-4" />
                    <span className="text-xs">
                      or press{" "}
                      <kbd className="px-1.5 py-0.5 bg-surface-elevated rounded text-[10px] border border-border">
                        Ctrl+V
                      </kbd>{" "}
                      to paste
                    </span>
                    <Clipboard className="w-3.5 h-3.5" />
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>
          </Card>

          {/* Prompt */}
          <Card header={{ title: "Prompt Configuration" }} padding="sm">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="w-full bg-background border border-border rounded-button px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none font-sans"
              placeholder="Describe what you want the model to analyze..."
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-text-muted">
                Model: {selectedMode.model}
              </span>
              <Button
                onClick={handleRunAnalysis}
                loading={loading}
                disabled={!uploadedFile}
                size="md"
              >
                <Play className="w-4 h-4" />
                Run Analysis
              </Button>
            </div>
          </Card>

          {/* Sample Images */}
          <Card header={{ title: "Quick Start Samples" }} padding="sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SAMPLE_IMAGES.map((sample) => (
                <button
                  key={sample.label}
                  onClick={() => handleSample(sample)}
                  className="flex flex-col items-center gap-2 p-3 rounded-button border border-border hover:border-accent/30 hover:bg-surface-elevated transition-all duration-200 group"
                >
                  <div
                    className="w-full aspect-video rounded-badge flex items-center justify-center"
                    style={{ backgroundColor: sample.color }}
                  >
                    <FileImage className="w-6 h-6 text-text-muted group-hover:text-accent transition-colors" />
                  </div>
                  <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors">
                    {sample.label}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column: Results */}
        <div className="space-y-4">
          {/* Error */}
          {error && (
            <Card padding="sm">
              <div className="flex items-center gap-2 text-critical">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            </Card>
          )}

          {/* Loading state */}
          {loading && (
            <Card padding="md">
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
                <div className="text-center">
                  <p className="text-sm text-text-primary font-medium">
                    Running {selectedMode.label}...
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Using {selectedMode.model}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Results */}
          {result && !loading && (
            <>
              {/* Reasoning Chain */}
              {result.think && (
                <Card padding="none">
                  <button
                    onClick={() => setReasoningOpen(!reasoningOpen)}
                    className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-surface-elevated/50 transition-colors"
                  >
                    {reasoningOpen ? (
                      <ChevronDown className="w-4 h-4 text-accent" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-accent" />
                    )}
                    <Brain className="w-4 h-4 text-accent" />
                    <span className="text-sm font-semibold text-text-primary">
                      Reasoning Chain
                    </span>
                  </button>
                  {reasoningOpen && (
                    <div className="px-4 pb-4">
                      <div className="bg-surface-elevated border-l-2 border-accent/40 rounded-badge p-3 font-mono text-sm text-text-secondary whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {result.think}
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Structured Results */}
              <Card
                header={{
                  title: "Analysis Results",
                  action: (
                    <Badge variant="success">
                      {selectedMode.label}
                    </Badge>
                  ),
                }}
                padding="sm"
              >
                {/* Mode-specific summary */}
                {selectedMode.key === "safety" && result.violations && (
                  <div className="space-y-2 mb-3">
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Violations
                    </p>
                    {(result.violations as Array<{ type: string; severity: string }>).map(
                      (v, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-3 py-2 bg-critical/5 border border-critical/15 rounded-badge"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-critical flex-shrink-0" />
                          <span className="text-sm text-text-primary flex-1">
                            {v.type}
                          </span>
                          <Badge
                            variant={
                              v.severity === "high" ? "critical" : "warning"
                            }
                          >
                            {v.severity}
                          </Badge>
                        </div>
                      )
                    )}
                  </div>
                )}

                {selectedMode.key === "product" && result.product && (
                  <div className="space-y-2 mb-3 p-3 bg-surface-elevated rounded-button border border-border">
                    <p className="text-sm font-semibold text-text-primary">
                      {(result.product as { brand?: string; name?: string }).brand}{" "}
                      {(result.product as { brand?: string; name?: string }).name}
                    </p>
                    {result.ingredients && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(result.ingredients as Array<{ name: string; flagged?: boolean }>).map(
                          (ing, i) => (
                            <Badge
                              key={i}
                              variant={ing.flagged ? "warning" : "info"}
                            >
                              {ing.name}
                            </Badge>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}

                {selectedMode.key === "inventory" && result.counts && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {Object.entries(
                      result.counts as Record<string, number>
                    ).map(([key, val]) => (
                      <div
                        key={key}
                        className="text-center p-2 bg-surface-elevated rounded-button border border-border"
                      >
                        <p className="text-lg font-bold text-accent">{val}</p>
                        <p className="text-xs text-text-muted capitalize">
                          {key}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {selectedMode.key === "fleet" && result.vehicles && (
                  <div className="space-y-2 mb-3">
                    {(result.vehicles as Array<{ type: string; position?: string }>).map(
                      (v, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-3 py-2 bg-surface-elevated rounded-badge border border-border"
                        >
                          <Truck className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                          <span className="text-sm text-text-primary">
                            {v.type}
                          </span>
                          {v.position && (
                            <span className="text-xs text-text-muted ml-auto">
                              {v.position}
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}

                {selectedMode.key === "quality" && result.score != null && (
                  <div className="flex items-center gap-4 mb-3 p-3 bg-surface-elevated rounded-button border border-border">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-accent">
                        {result.score}%
                      </p>
                      <p className="text-xs text-text-muted">Quality Score</p>
                    </div>
                    {result.issues && (
                      <div className="flex-1 space-y-1">
                        {(result.issues as string[]).map((issue, i) => (
                          <p
                            key={i}
                            className="text-xs text-warning flex items-center gap-1"
                          >
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                            {issue}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Full JSON response */}
                <div className="mt-2">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                    Raw Response
                  </p>
                  <div
                    className="bg-background rounded-button p-3 font-mono text-xs text-text-secondary max-h-72 overflow-auto border border-border"
                    dangerouslySetInnerHTML={{ __html: renderJson(result) }}
                  />
                </div>
              </Card>

              {/* Metadata */}
              <Card padding="sm">
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span>
                    Model:{" "}
                    <span className="text-text-primary font-medium">
                      {selectedMode.model}
                    </span>
                  </span>
                  {processingTime != null && (
                    <span>
                      Time:{" "}
                      <span className="text-text-primary font-medium">
                        {processingTime}ms
                      </span>
                    </span>
                  )}
                  <span>
                    Status:{" "}
                    <span className="text-accent font-medium">Complete</span>
                  </span>
                </div>
              </Card>
            </>
          )}

          {/* Empty state */}
          {!result && !loading && !error && (
            <Card padding="lg">
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                <div className="w-16 h-16 rounded-card bg-accent/5 flex items-center justify-center">
                  <Brain className="w-8 h-8 text-accent/40" />
                </div>
                <div>
                  <p className="text-sm text-text-secondary font-medium">
                    Upload an image and run analysis
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Results will appear here with detections, reasoning, and
                    structured data
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CosmosAI;
