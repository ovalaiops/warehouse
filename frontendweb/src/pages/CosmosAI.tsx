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
  Clipboard,
  Wand2,
  ImagePlus,
  History,
  Trash2,
  X,
  Maximize2,
  Activity,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useInferenceHistoryStore,
  createThumbnailDataUrl,
} from "@/store/inferenceHistoryStore";
import { GpuMonitorPanel } from "@/components/common/GpuMonitorPanel";
import { LiveFeedPanel } from "@/components/cosmos/LiveFeedPanel";

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
  demoHint: string;
}

interface Detection {
  label: string;
  bbox?: number[] | null; // [x1, y1, x2, y2]
  confidence?: number | null;
  metadata?: Record<string, unknown>;
}

interface InferenceResult {
  think?: string;
  detections?: Detection[];
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
    demoHint: "Generates a warehouse scene with PPE violations, spills, and blocked exits",
  },
  {
    key: "inventory",
    label: "Inventory Analysis",
    icon: Package,
    description: "Count items, detect anomalies, rack compliance",
    defaultPrompt:
      "Count all visible items on the shelves. Detect any empty positions or misplaced items. Return item counts and anomaly locations with bounding boxes.",
    model: "Cosmos-Reason2-8B",
    demoHint: "Generates a pallet rack with empty slots, damaged boxes, and countable items",
  },
  {
    key: "product",
    label: "Product Recognition",
    icon: Eye,
    description: "Identify products, analyze ingredients",
    defaultPrompt:
      "Identify this product. Provide brand, name, category, and analyze visible ingredients. Flag any concerning additives.",
    model: "Cosmos-Reason2-2B",
    demoHint: "Generates a product box with visible label, nutrition facts, and barcode",
  },
  {
    key: "fleet",
    label: "Fleet Tracking",
    icon: Truck,
    description: "Track vehicles, detect trajectories",
    defaultPrompt:
      "Track all vehicles in this warehouse scene. Identify forklifts, AGVs, and pallet jacks. Provide bounding boxes and estimated trajectories.",
    model: "Cosmos-Reason2-8B",
    demoHint: "Generates an overhead view with forklifts, AGV, and vehicle trajectories",
  },
  {
    key: "quality",
    label: "Quality Inspection",
    icon: CheckCircle2,
    description: "Check packaging, labels, seals",
    defaultPrompt:
      "Inspect this package/product for quality issues. Check seal integrity, label alignment, and packaging condition.",
    model: "Cosmos-Reason2-2B",
    demoHint: "Generates a package with tears, crooked labels, and tape defects",
  },
  {
    key: "caption",
    label: "Scene Captioning",
    icon: Sparkles,
    description: "General scene description",
    defaultPrompt:
      "Describe this warehouse scene in detail. Include information about activities, equipment, zones, and any notable observations.",
    model: "Cosmos-Reason2-2B",
    demoHint: "Generates a busy warehouse with conveyors, forklifts, workers, and dock activity",
  },
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

/** Generate an AI test image via backend Gemini API. */
async function generateDemoImage(scenario: string): Promise<{
  image_base64: string;
  source: string;
  dataUrl: string;
}> {
  const formData = new FormData();
  const res = await fetch(`/infer/generate/${scenario}`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`Image generation failed: ${res.status}`);
  const data = await res.json();
  if (!data.image_base64) throw new Error("No image returned from generator");
  return {
    image_base64: data.image_base64,
    source: data.source === "gemini" ? "AI Generated" : "Synthetic",
    dataUrl: `data:image/jpeg;base64,${data.image_base64}`,
  };
}

async function checkModelHealth() {
  const res = await fetch("/models/health");
  if (!res.ok) return null;
  return res.json();
}

/** Convert base64 JPEG to File object */
function base64ToFile(b64: string, filename: string): File {
  const byteString = atob(b64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new File([ab], filename, { type: "image/jpeg" });
}

// ---------------------------------------------------------------------------
// BBox overlay for image preview
// ---------------------------------------------------------------------------

interface BBoxOverlayProps {
  detections: Array<{ label: string; bbox?: number[] | null; confidence?: number | null }>;
  imageNaturalSize: { w: number; h: number };
  hoveredBbox: number | null;
  setHoveredBbox: (idx: number | null) => void;
}

function BBoxOverlay({ detections, imageNaturalSize, hoveredBbox, setHoveredBbox }: BBoxOverlayProps) {
  const natW = imageNaturalSize.w;
  const natH = imageNaturalSize.h;

  // Use SVG with viewBox matching image dimensions so boxes align with object-contain
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${natW} ${natH}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {detections.map((det, i) => {
        if (!det.bbox || det.bbox.length < 4) return null;
        let [x1, y1, x2, y2] = det.bbox;

        // Convert normalized coords to pixel coords
        if (x1 <= 1.0 && y1 <= 1.0 && x2 <= 1.0 && y2 <= 1.0) {
          x1 *= natW; y1 *= natH; x2 *= natW; y2 *= natH;
        }

        const w = x2 - x1;
        const h = y2 - y1;
        if (w <= 0 || h <= 0) return null;

        const color = getBBoxColor(det.label);
        const isHovered = hoveredBbox === i;

        return (
          <g key={i} className="pointer-events-auto cursor-pointer">
            <rect
              x={x1} y={y1} width={w} height={h}
              fill="none" stroke={color} strokeWidth={isHovered ? 3 : 2}
              opacity={isHovered ? 1 : 0.7}
              rx={2}
              onMouseEnter={() => setHoveredBbox(i)}
              onMouseLeave={() => setHoveredBbox(null)}
            />
            {/* Invisible wider hit area for easier hover */}
            <rect
              x={x1 - 4} y={y1 - 4} width={w + 8} height={h + 8}
              fill="none" stroke="transparent" strokeWidth={8}
              onMouseEnter={() => setHoveredBbox(i)}
              onMouseLeave={() => setHoveredBbox(null)}
            />
            {isHovered && (
              <>
                <rect
                  x={x1} y={y1 - 18}
                  width={det.label.length * 7 + (det.confidence != null ? 30 : 0) + 8}
                  height={16} rx={3}
                  fill={color}
                />
                <text
                  x={x1 + 4} y={y1 - 6}
                  fontSize={11} fontFamily="monospace" fill="#08070e"
                >
                  {det.label}{det.confidence != null ? ` ${Math.round(det.confidence * 100)}%` : ""}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CosmosAI: React.FC = () => {
  const [topTab, setTopTab] = useState<"lab" | "livefeed">("lab");
  const [selectedMode, setSelectedMode] = useState<AnalysisMode>(MODES[0]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(MODES[0].defaultPrompt);
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [imageSource, setImageSource] = useState<string | null>(null);

  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showMonitoring, setShowMonitoring] = useState(false);
  const [showBboxOverlay, setShowBboxOverlay] = useState(false);
  const [hoveredBbox, setHoveredBbox] = useState<number | null>(null);
  const [imageNaturalSize, setImageNaturalSize] = useState<{ w: number; h: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { entries: historyEntries, addEntry, removeEntry, clearAll } = useInferenceHistoryStore();

  const saveToHistory = async (
    mode: AnalysisMode,
    imgDataUrl: string,
    source: string,
    elapsed: number,
    res: InferenceResult
  ) => {
    const thumbnail = await createThumbnailDataUrl(imgDataUrl);
    addEntry({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      mode: mode.key,
      modeLabel: mode.label,
      model: mode.model,
      thumbnailDataUrl: thumbnail,
      imageSource: source,
      processingTimeMs: elapsed,
      result: res as Record<string, unknown>,
    });
  };

  // Model health
  const { data: healthData } = useQuery({
    queryKey: ["model-health"],
    queryFn: checkModelHealth,
    refetchInterval: 30000,
  });

  // Revoke old object URLs
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Handle mode switch — clear previous image/results
  const handleModeChange = (mode: AnalysisMode) => {
    setSelectedMode(mode);
    setPrompt(mode.defaultPrompt);
    if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setUploadedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setProcessingTime(null);
    setImageSource(null);
    setShowBboxOverlay(false);
    setImageNaturalSize(null);
  };

  // File handling
  const handleFile = useCallback((file: File, source?: string) => {
    setUploadedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setProcessingTime(null);
    setImageSource(source || "upload");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) handleFile(file, "upload");
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
    if (file) handleFile(file, "upload");
  };

  // Clipboard paste
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) handleFile(file, "clipboard");
          break;
        }
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [handleFile]);

  // Generate demo image and auto-run inference
  const handleGenerateDemo = async (mode: AnalysisMode) => {
    handleModeChange(mode);
    setGenerating(true);
    setError(null);
    setResult(null);
    setProcessingTime(null);

    try {
      // Step 1: Generate image
      const genResult = await generateDemoImage(mode.key);
      const file = base64ToFile(genResult.image_base64, `${mode.key}_demo.jpg`);
      setUploadedFile(file);
      setPreviewUrl(genResult.dataUrl);
      setImageSource(genResult.source);
      setGenerating(false);

      // Step 2: Auto-run inference on generated image
      setLoading(true);
      const start = performance.now();
      const res = await runInference(mode.key, file, mode.defaultPrompt);
      const elapsed = Math.round(performance.now() - start);
      setProcessingTime(elapsed);
      setResult(res);
      if (res.think) setReasoningOpen(true);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

      // Save to history
      saveToHistory(mode, genResult.dataUrl, genResult.source, elapsed, res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo generation failed");
      setGenerating(false);
    } finally {
      setLoading(false);
    }
  };

  // Run analysis on uploaded image
  const handleRunAnalysis = async () => {
    if (!uploadedFile) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setProcessingTime(null);
    const start = performance.now();
    try {
      const res = await runInference(selectedMode.key, uploadedFile, prompt);
      const elapsed = Math.round(performance.now() - start);
      setProcessingTime(elapsed);
      setResult(res);
      if (res.think) setReasoningOpen(true);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

      // Save to history
      if (previewUrl) {
        saveToHistory(selectedMode, previewUrl, imageSource || "upload", elapsed, res);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  // JSON syntax highlight with proper formatting
  const renderJson = (obj: unknown) => {
    const raw = JSON.stringify(obj, null, 2);
    // Highlight keys, strings, numbers, booleans
    return raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"([^"]+)":/g, '<span class="text-accent">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="text-yellow-400">"$1"</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span class="text-blue-400">$1</span>')
      .replace(/: (true|false|null)/g, ': <span class="text-purple-400">$1</span>');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3 font-display">
            <Brain className="w-7 h-7 text-accent" />
            Cosmos AI Lab
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Test NVIDIA Cosmos Reason 2 physical AI models
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMonitoring(!showMonitoring)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium border transition-colors",
              showMonitoring
                ? "bg-accent/10 text-accent border-accent/30"
                : "text-text-muted border-border hover:text-text-secondary"
            )}
          >
            <Activity className="w-3.5 h-3.5" />
            GPU Monitor
          </button>
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

      {/* GPU Monitoring Panel */}
      {showMonitoring && <GpuMonitorPanel />}

      {/* Top-level tab: Analysis Lab vs Live Feed */}
      <div className="flex gap-1 p-1 bg-surface-elevated rounded-button border border-border">
        <button
          onClick={() => setTopTab("lab")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-button text-sm font-medium transition-all flex-1 justify-center",
            topTab === "lab"
              ? "bg-accent/10 text-accent border border-accent/30"
              : "text-text-secondary hover:text-text-primary border border-transparent"
          )}
        >
          <Brain className="w-4 h-4" />
          Analysis Lab
        </button>
        <button
          onClick={() => setTopTab("livefeed")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-button text-sm font-medium transition-all flex-1 justify-center",
            topTab === "livefeed"
              ? "bg-accent/10 text-accent border border-accent/30"
              : "text-text-secondary hover:text-text-primary border border-transparent"
          )}
        >
          <Radio className="w-4 h-4" />
          Live Feed
        </button>
      </div>

      {/* Live Feed Tab */}
      {topTab === "livefeed" && <LiveFeedPanel />}

      {/* Analysis Lab Tab */}
      {topTab === "lab" && (<>

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

      {/* Dual Path Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PATH 1: Generate AI Test Image */}
        <Card padding="sm">
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-xs text-text-muted text-center">
              Generate a realistic AI image using Gemini for <span className="text-text-primary font-medium">{selectedMode.label}</span>, then auto-analyze with Cosmos Reason 2.
            </p>
            <Button
              onClick={() => handleGenerateDemo(selectedMode)}
              disabled={generating || loading}
              size="lg"
            >
              {generating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Wand2 className="w-5 h-5" />
              )}
              {generating ? `Generating ${selectedMode.label}...` : "Generate AI Test Image"}
            </Button>
            <p className="text-[10px] text-text-muted">
              {selectedMode.demoHint}
            </p>
          </div>
        </Card>

        {/* PATH 2: Real Upload */}
        <Card
          header={{
            title: "Real Upload",
            action: (
              <Badge variant="success">
                <ImagePlus className="w-3 h-3 mr-1" />
                Your Image
              </Badge>
            ),
          }}
          padding="sm"
        >
          <p className="text-xs text-text-muted mb-3">
            Upload a real warehouse image or paste from clipboard for authentic analysis.
          </p>
          <div
            ref={imageContainerRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-button border-2 border-dashed cursor-pointer transition-all duration-200 min-h-[200px] overflow-hidden",
              dragActive
                ? "border-accent/60 bg-accent/5"
                : "border-border hover:border-accent/40"
            )}
          >
            {previewUrl ? (
              <div className="relative w-full h-full min-h-[200px] group">
                <img
                  src={previewUrl}
                  alt="Uploaded"
                  className="w-full h-full object-contain max-h-[300px]"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setImageNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                  }}
                />
                {/* Bounding box overlays */}
                {showBboxOverlay && result?.detections && imageNaturalSize && (
                  <BBoxOverlay
                    detections={result.detections}
                    imageNaturalSize={imageNaturalSize}
                    hoveredBbox={hoveredBbox}
                    setHoveredBbox={setHoveredBbox}
                  />
                )}
                {imageSource && (
                  <div className="absolute top-2 left-2">
                    <Badge variant={imageSource.includes("AI") || imageSource.includes("Synthetic") ? "info" : "success"}>
                      {imageSource}
                    </Badge>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  {/* BBox toggle */}
                  {result?.detections && result.detections.length > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowBboxOverlay(!showBboxOverlay); }}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-button text-[10px] font-medium transition-all",
                        showBboxOverlay
                          ? "bg-accent/80 text-white"
                          : "bg-black/50 text-white opacity-0 group-hover:opacity-100"
                      )}
                      title="Toggle bounding boxes"
                    >
                      <Eye className="w-3 h-3" />
                      BBox
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightboxUrl(previewUrl); }}
                    className="p-1.5 rounded-button bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                    title="View full size"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-14 h-14 rounded-card bg-surface-elevated flex items-center justify-center">
                  <Camera className="w-7 h-7 text-text-muted" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-text-secondary font-medium">
                    Drop image or click to browse
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    PNG, JPG, WebP
                  </p>
                </div>
                <div className="flex items-center gap-2 text-text-muted">
                  <Upload className="w-3.5 h-3.5" />
                  <span className="text-[10px]">
                    or{" "}
                    <kbd className="px-1 py-0.5 bg-surface-elevated rounded text-[9px] border border-border">
                      Ctrl+V
                    </kbd>{" "}
                    to paste
                  </span>
                  <Clipboard className="w-3 h-3" />
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
      </div>

      {/* Prompt + Run (shared) */}
      {uploadedFile && (
        <Card header={{ title: "Prompt Configuration" }} padding="sm">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
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
              disabled={!uploadedFile || generating}
              size="md"
            >
              <Play className="w-4 h-4" />
              Run Analysis
            </Button>
          </div>
        </Card>
      )}

      {/* Results Section */}
      <div ref={resultsRef} className="space-y-4">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Structured Results */}
            <div className="space-y-4">
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

              {/* Mode-specific results */}
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
                {/* Safety violations */}
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
                            variant={v.severity === "high" ? "critical" : "warning"}
                          >
                            {v.severity}
                          </Badge>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Safety score */}
                {selectedMode.key === "safety" && result.safety_score != null && (
                  <div className="flex items-center gap-3 mb-3 p-3 bg-surface-elevated rounded-button border border-border">
                    <div className="text-center">
                      <p className={cn(
                        "text-2xl font-bold",
                        result.safety_score >= 80 ? "text-accent" :
                        result.safety_score >= 50 ? "text-warning" : "text-critical"
                      )}>
                        {result.safety_score}
                      </p>
                      <p className="text-xs text-text-muted">Safety Score</p>
                    </div>
                  </div>
                )}

                {/* Product info */}
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

                {/* Inventory counts */}
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

                {/* Fleet vehicles */}
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

                {/* Quality score */}
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

                {/* Caption / scene summary */}
                {selectedMode.key === "caption" && result.caption && (
                  <div className="p-3 bg-surface-elevated rounded-button border border-border mb-3">
                    <p className="text-sm text-text-primary leading-relaxed">
                      {result.caption as string}
                    </p>
                  </div>
                )}

                {/* Detections list */}
                {result.detections && result.detections.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                      Detections ({result.detections.length})
                    </p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {result.detections.map((det, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-2 py-1.5 bg-surface-elevated rounded-badge border border-border"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: getBBoxColor(det.label) }}
                            />
                            <span className="text-xs font-medium text-text-primary capitalize">
                              {det.label.replace(/_/g, " ")}
                            </span>
                          </div>
                          {det.confidence != null && (
                            <span className="text-xs text-text-muted font-mono">
                              {Math.round(det.confidence * 100)}%
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Metadata */}
              <Card padding="sm">
                <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap">
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
                  {imageSource && (
                    <span>
                      Source:{" "}
                      <span className="text-text-primary font-medium">
                        {imageSource}
                      </span>
                    </span>
                  )}
                  <span>
                    Status:{" "}
                    <span className="text-accent font-medium">Complete</span>
                  </span>
                </div>
              </Card>
            </div>

            {/* Right: Raw JSON */}
            <Card
              header={{
                title: "Raw Response",
                action: (
                  <Badge variant="info">JSON</Badge>
                ),
              }}
              padding="sm"
            >
              <pre
                className="bg-background rounded-button p-4 font-mono text-[11px] leading-relaxed text-text-secondary max-h-[600px] overflow-auto border border-border whitespace-pre-wrap break-words"
                dangerouslySetInnerHTML={{ __html: renderJson(result) }}
              />
            </Card>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && !generating && (
          <Card padding="lg">
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-16 h-16 rounded-card bg-accent/5 flex items-center justify-center">
                <Brain className="w-8 h-8 text-accent/40" />
              </div>
              <div>
                <p className="text-sm text-text-secondary font-medium">
                  Choose a demo scenario or upload your own image
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Use <strong>Simulated Demo</strong> to generate a test scene, or <strong>Real Upload</strong> for your own data
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Inference History */}
      {historyEntries.length > 0 && (
        <Card
          header={{
            title: (
              <span className="flex items-center gap-2">
                <History className="w-4 h-4 text-accent" />
                Inference History
                <Badge variant="info">{historyEntries.length}</Badge>
              </span>
            ),
            action: (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (confirm("Clear all inference history?")) clearAll();
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </Button>
            ),
          }}
          padding="sm"
        >
          {/* Filter tabs */}
          <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
            <button
              onClick={() => setHistoryFilter(null)}
              className={cn(
                "px-3 py-1 rounded-button text-xs font-medium transition-colors border",
                historyFilter === null
                  ? "bg-accent/10 text-accent border-accent/30"
                  : "text-text-muted border-transparent hover:text-text-secondary"
              )}
            >
              All
            </button>
            {Array.from(new Set(historyEntries.map((e) => e.mode))).map((mode) => {
              const modeInfo = MODES.find((m) => m.key === mode);
              const Icon = modeInfo?.icon || Brain;
              return (
                <button
                  key={mode}
                  onClick={() => setHistoryFilter(mode)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-button text-xs font-medium transition-colors border whitespace-nowrap",
                    historyFilter === mode
                      ? "bg-accent/10 text-accent border-accent/30"
                      : "text-text-muted border-transparent hover:text-text-secondary"
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {modeInfo?.label || mode}
                  <span className="text-[10px] opacity-60">
                    ({historyEntries.filter((e) => e.mode === mode).length})
                  </span>
                </button>
              );
            })}
          </div>

          {/* History entries */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {historyEntries
              .filter((e) => !historyFilter || e.mode === historyFilter)
              .map((entry) => {
                const isExpanded = expandedHistoryId === entry.id;
                const ModeIcon = MODES.find((m) => m.key === entry.mode)?.icon || Brain;
                return (
                  <div
                    key={entry.id}
                    className="border border-border rounded-button overflow-hidden bg-surface"
                  >
                    {/* Collapsed row */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedHistoryId(isExpanded ? null : entry.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedHistoryId(isExpanded ? null : entry.id); } }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-surface-elevated/50 transition-colors cursor-pointer"
                    >
                      {/* Thumbnail */}
                      <img
                        src={entry.thumbnailDataUrl}
                        alt=""
                        className="w-12 h-12 rounded object-cover flex-shrink-0 border border-border hover:ring-2 hover:ring-accent/40 transition-all cursor-zoom-in"
                        onClick={(e) => { e.stopPropagation(); setLightboxUrl(entry.thumbnailDataUrl); }}
                        title="Click to enlarge"
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <ModeIcon className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                          <span className="text-sm font-medium text-text-primary truncate">
                            {entry.modeLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-text-muted">
                          <span>{new Date(entry.timestamp).toLocaleString()}</span>
                          <span>{entry.processingTimeMs}ms</span>
                          <span>{entry.model}</span>
                          <Badge variant="info" className="text-[9px] px-1 py-0">
                            {entry.imageSource}
                          </Badge>
                        </div>
                      </div>

                      {/* Expand/collapse */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeEntry(entry.id);
                          }}
                          className="p-1 rounded hover:bg-critical/10 text-text-muted hover:text-critical transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-text-muted" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-text-muted" />
                        )}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-border px-3 py-3 bg-background">
                        <pre
                          className="bg-surface-elevated rounded-button p-3 font-mono text-[11px] leading-relaxed text-text-secondary max-h-[400px] overflow-auto border border-border whitespace-pre-wrap break-words"
                          dangerouslySetInnerHTML={{
                            __html: renderJson(entry.result),
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      </>)}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-button bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Full size"
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default CosmosAI;
