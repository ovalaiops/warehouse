import React, { useState, useRef, useCallback, useEffect } from "react";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import {
  Radio,
  Play,
  Square,
  Loader2,
  Clock,
  Brain,
  AlertTriangle,
  Maximize2,
  X,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LiveFeedEvent {
  type: "status" | "connected" | "inference" | "error" | "ended";
  message?: string;
  frame_number?: number;
  timestamp: number;
  frame_base64?: string;
  reasoning?: string;
  result?: Record<string, unknown>;
  raw_output?: string;
  model?: string;
  processing_time_ms?: number;
  error?: string;
  fps?: number;
  total_frames?: number;
}

// ---------------------------------------------------------------------------
// Sample URLs for quick testing
// ---------------------------------------------------------------------------

const SAMPLE_URLS = [
  {
    label: "Public HLS Stream",
    url: "https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8",
    description: "Akamai public HLS test stream",
  },
  {
    label: "Big Buck Bunny (HLS)",
    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    description: "Mux HLS test stream",
  },
];

const DEFAULT_PROMPTS = [
  {
    label: "Safety Monitor",
    prompt:
      "Analyze this frame for safety concerns. Identify people, vehicles, PPE compliance, hazards, and any unsafe conditions. Be specific about locations.",
  },
  {
    label: "Activity Caption",
    prompt:
      "Describe all activities happening in this frame. Note the number of people, what they are doing, any vehicles or equipment in motion, and the general scene layout.",
  },
  {
    label: "Object Counter",
    prompt:
      "Count and classify all visible objects in this frame. Provide counts for people, vehicles, equipment, and any other notable items. Return structured data.",
  },
  {
    label: "Anomaly Detection",
    prompt:
      "Detect any anomalies or unusual events in this frame. Look for unexpected objects, unusual behavior, obstructions, or anything out of the ordinary.",
  },
  {
    label: "Predict Next Action",
    prompt:
      "Based on what you observe in this frame, predict the next likely actions or events. Consider people's trajectories, vehicle movements, ongoing activities, and environmental cues. Return structured data.",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const LiveFeedPanel: React.FC = () => {
  const [url, setUrl] = useState("");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPTS[0].prompt);
  const [interval, setInterval_] = useState(3);
  const [maxFrames, setMaxFrames] = useState(50);
  const [streaming, setStreaming] = useState(false);
  const [events, setEvents] = useState<LiveFeedEvent[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reasoningTopRef = useRef<HTMLDivElement>(null);
  const hasStreamErrorRef = useRef(false);

  const inferenceEvents = events.filter((e) => e.type === "inference");
  const errorEvents = events.filter((e) => e.type === "error" && e.frame_number);
  const statusEvents = events.filter(
    (e) => e.type === "status" || e.type === "connected"
  );
  const totalProcessingMs = inferenceEvents.reduce(
    (sum, e) => sum + (e.processing_time_ms || 0),
    0
  );
  const avgLatency =
    inferenceEvents.length > 0
      ? Math.round(totalProcessingMs / inferenceEvents.length)
      : 0;

  // The "active" frame shown on the left — latest or user-selected
  const activeEvent =
    selectedFrame !== null
      ? inferenceEvents[selectedFrame]
      : inferenceEvents[inferenceEvents.length - 1] || null;

  // Auto-scroll reasoning feed to top (latest frames)
  useEffect(() => {
    if (reasoningTopRef.current && streaming && selectedFrame === null) {
      reasoningTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [events.length, streaming, selectedFrame]);

  const startStream = useCallback(() => {
    if (!url.trim()) return;

    setStreaming(true);
    setEvents([]);
    setSelectedFrame(null);
    setConnectionError(null);
    hasStreamErrorRef.current = false;

    const params = new URLSearchParams({
      url: url.trim(),
      prompt,
      interval: String(interval),
      max_frames: String(maxFrames),
    });

    const es = new EventSource(`/infer/live-feed?${params.toString()}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: LiveFeedEvent = JSON.parse(event.data);
        setEvents((prev) => [...prev, data]);

        if (data.type === "ended") {
          es.close();
          setStreaming(false);
        }
        if (data.type === "error" && !data.frame_number) {
          hasStreamErrorRef.current = true;
          setConnectionError(data.error || "Stream connection failed");
          es.close();
          setStreaming(false);
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = (err) => {
      console.error("EventSource error:", err);
      es.close();
      setStreaming(false);
      // Only set generic error if we haven't already captured a specific error
      if (!hasStreamErrorRef.current) {
        setConnectionError("Connection lost or failed. The stream may have ended.");
      }
    };
  }, [url, prompt, interval, maxFrames]);

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStreaming(false);
  }, []);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightboxSrc(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={lightboxSrc}
            alt="Frame"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}

      {/* STEP 1: Enter URL */}
      <Card padding="md">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-bold">1</span>
            <label className="text-xs font-medium text-text-secondary">
              Enter Live Feed URL
            </label>
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="YouTube Live URL, IP camera URL, HLS .m3u8, RTSP..."
            className="w-full bg-surface-elevated border border-border rounded-button px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            disabled={streaming}
          />
          {!streaming && (
            <div className="flex flex-wrap gap-2">
              {SAMPLE_URLS.map((s) => (
                <button
                  key={s.url}
                  onClick={() => setUrl(s.url)}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] rounded border border-border text-text-muted hover:text-text-secondary hover:border-accent/30 transition-colors"
                  title={s.description}
                >
                  <ExternalLink className="w-3 h-3" />
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* STEP 2: Select Prompt */}
      <Card padding="md">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-bold">2</span>
              <label className="text-xs font-medium text-text-secondary">
                Select Analysis Prompt
              </label>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-[10px] text-text-muted hover:text-accent"
            >
              {showSettings ? "Hide" : "Show"} Settings
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_PROMPTS.map((p) => (
              <button
                key={p.label}
                onClick={() => !streaming && setPrompt(p.prompt)}
                disabled={streaming}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-button border transition-colors font-medium",
                  prompt === p.prompt
                    ? "bg-accent/10 text-accent border-accent/30"
                    : "border-border text-text-muted hover:text-text-secondary hover:border-accent/20",
                  streaming && "opacity-60 cursor-not-allowed"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            className="w-full bg-surface-elevated border border-border rounded-button px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
            disabled={streaming}
          />

          {showSettings && !streaming && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-surface-elevated rounded-button border border-border">
              <div>
                <label className="text-[10px] text-text-muted mb-1 block">
                  Frame Interval: {interval}s
                </label>
                <input
                  type="range"
                  min={1}
                  max={15}
                  value={interval}
                  onChange={(e) => setInterval_(Number(e.target.value))}
                  className="w-full h-1.5 bg-border rounded-full appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between text-[9px] text-text-muted mt-0.5">
                  <span>1s</span>
                  <span>5s</span>
                  <span>15s</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-text-muted mb-1 block">
                  Max Frames: {maxFrames}
                </label>
                <input
                  type="range"
                  min={5}
                  max={200}
                  step={5}
                  value={maxFrames}
                  onChange={(e) => setMaxFrames(Number(e.target.value))}
                  className="w-full h-1.5 bg-border rounded-full appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between text-[9px] text-text-muted mt-0.5">
                  <span>5</span>
                  <span>50</span>
                  <span>200</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* STEP 3: Start / Stop */}
      <Card padding="md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-bold">3</span>
            <label className="text-xs font-medium text-text-secondary">
              Start Analysis
            </label>
          </div>
          <div className="flex-1" />
          {!streaming ? (
            <Button
              onClick={startStream}
              disabled={!url.trim()}
              size="lg"
            >
              <Play className="w-5 h-5" />
              Start Live Analysis
            </Button>
          ) : (
            <Button
              onClick={stopStream}
              variant="danger"
              size="lg"
            >
              <Square className="w-5 h-5" />
              Stop
            </Button>
          )}
        </div>
        {connectionError && !streaming && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-critical/5 border border-critical/20 rounded-button">
            <AlertTriangle className="w-4 h-4 text-critical flex-shrink-0" />
            <span className="text-xs text-critical">{connectionError}</span>
          </div>
        )}
      </Card>

      {/* Live Stats Bar */}
      {events.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-4 px-4 py-2 bg-surface-elevated rounded-button border border-border text-xs">
            {streaming && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-critical animate-pulse" />
                <span className="text-critical font-medium">LIVE</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-text-muted">
              <Brain className="w-3 h-3" />
              <span>{inferenceEvents.length} frames analyzed</span>
            </div>
            {avgLatency > 0 && (
              <div className="flex items-center gap-1 text-text-muted">
                <Clock className="w-3 h-3" />
                <span>Avg {avgLatency}ms</span>
              </div>
            )}
            {errorEvents.length > 0 && (
              <div className="flex items-center gap-1 text-critical">
                <AlertTriangle className="w-3 h-3" />
                <span>{errorEvents.length} errors</span>
              </div>
            )}
            {statusEvents.length > 0 && (
              <span className="text-text-muted ml-auto truncate max-w-xs">
                {statusEvents[statusEvents.length - 1].message}
              </span>
            )}
          </div>
          {/* Show stream-level errors (e.g. YouTube bot detection) */}
          {events.filter((e) => e.type === "error" && !e.frame_number).map((e, i) => (
            <div key={i} className="flex items-center gap-2 px-4 py-2 bg-critical/5 border border-critical/20 rounded-button">
              <AlertTriangle className="w-4 h-4 text-critical flex-shrink-0" />
              <span className="text-xs text-critical">{e.error}</span>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================= */}
      {/* SIDE-BY-SIDE: Live Frame (left) + Reasoning Feed (right)       */}
      {/* ============================================================= */}
      {inferenceEvents.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT — Current Frame */}
          <Card
            header={{
              title: (
                <span className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-accent" />
                  Live Frame
                  {streaming && (
                    <span className="w-2 h-2 rounded-full bg-critical animate-pulse" />
                  )}
                </span>
              ),
              action: activeEvent ? (
                <span className="text-[10px] text-text-muted">
                  Frame #{activeEvent.frame_number} &middot;{" "}
                  {new Date(activeEvent.timestamp * 1000).toLocaleTimeString()}
                </span>
              ) : undefined,
            }}
            padding="sm"
          >
            {activeEvent?.frame_base64 ? (
              <div className="space-y-3">
                {/* Large frame display */}
                <div
                  className="relative cursor-zoom-in group"
                  onClick={() =>
                    setLightboxSrc(
                      `data:image/jpeg;base64,${activeEvent.frame_base64}`
                    )
                  }
                >
                  <img
                    src={`data:image/jpeg;base64,${activeEvent.frame_base64}`}
                    alt={`Frame ${activeEvent.frame_number}`}
                    className="w-full rounded object-contain max-h-[400px] bg-black"
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-5 h-5 text-white drop-shadow-lg" />
                  </div>
                  {/* Overlay badges */}
                  <div className="absolute bottom-2 left-2 flex gap-1.5">
                    <Badge variant="info">
                      {activeEvent.processing_time_ms}ms
                    </Badge>
                    <Badge variant="success">
                      {activeEvent.model}
                    </Badge>
                  </div>
                </div>

                {/* Frame thumbnail strip — newest first */}
                {inferenceEvents.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {inferenceEvents.slice().reverse().map((ev, revIdx) => {
                      const idx = inferenceEvents.length - 1 - revIdx;
                      return (
                        <button
                          key={idx}
                          onClick={() =>
                            setSelectedFrame(
                              selectedFrame === idx ? null : idx
                            )
                          }
                          className={cn(
                            "flex-shrink-0 w-14 h-10 rounded overflow-hidden border-2 transition-all",
                            (selectedFrame === idx ||
                              (selectedFrame === null &&
                                idx === inferenceEvents.length - 1))
                              ? "border-accent shadow-[0_0_8px_rgba(0,255,178,0.3)]"
                              : "border-transparent opacity-60 hover:opacity-100"
                          )}
                        >
                          {ev.frame_base64 ? (
                            <img
                              src={`data:image/jpeg;base64,${ev.frame_base64}`}
                              alt={`Frame ${ev.frame_number}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-surface-elevated flex items-center justify-center">
                              <span className="text-[8px] text-text-muted">
                                #{ev.frame_number}
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-text-muted">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}
          </Card>

          {/* RIGHT — Reasoning + Results Feed */}
          <Card
            header={{
              title: (
                <span className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  Cosmos Reason 2 Output
                </span>
              ),
              action: (
                <span className="text-[10px] text-text-muted">
                  {inferenceEvents.length} / {maxFrames} frames
                </span>
              ),
            }}
            padding="sm"
          >
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              <div ref={reasoningTopRef} />

              {/* Timeline of all frames — newest first, click to expand */}
              <div>
                <p className="text-[10px] font-medium text-text-secondary mb-2">
                  Frame Timeline
                </p>
                {inferenceEvents
                  .slice()
                  .reverse()
                  .map((event, revIdx) => {
                    const idx = inferenceEvents.length - 1 - revIdx;
                    const isExpanded = selectedFrame === idx;
                    return (
                      <div key={idx} className="mb-1">
                        <div
                          onClick={() =>
                            setSelectedFrame(isExpanded ? null : idx)
                          }
                          className={cn(
                            "flex items-start gap-2 p-2 rounded cursor-pointer transition-colors",
                            isExpanded
                              ? "bg-accent/5 border border-accent/20"
                              : "hover:bg-surface-elevated"
                          )}
                        >
                          {/* Mini thumbnail */}
                          {event.frame_base64 && (
                            <div className="w-10 h-7 rounded overflow-hidden flex-shrink-0">
                              <img
                                src={`data:image/jpeg;base64,${event.frame_base64}`}
                                alt={`Frame ${event.frame_number}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-medium text-text-primary">
                                #{event.frame_number}
                              </span>
                              <Badge variant="info">
                                {event.processing_time_ms}ms
                              </Badge>
                              <span className="text-[9px] text-text-muted">
                                {new Date(
                                  event.timestamp * 1000
                                ).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className={cn(
                              "text-[10px] text-text-muted mt-0.5",
                              isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"
                            )}>
                              {event.reasoning
                                ? event.reasoning
                                : event.raw_output || "Processing..."}
                            </p>

                            {isExpanded && event.result &&
                              Object.keys(event.result).length > 0 && (
                                <div className="mt-2">
                                  <p className="text-[10px] font-medium text-text-secondary mb-1">
                                    Structured Output
                                  </p>
                                  <pre className="text-[10px] text-text-muted bg-surface p-2 rounded overflow-x-auto whitespace-pre-wrap">
                                    {JSON.stringify(event.result, null, 2)}
                                  </pre>
                                </div>
                              )}
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-3 h-3 text-accent flex-shrink-0 mt-1" />
                          ) : (
                            <ChevronRight className="w-3 h-3 text-text-muted flex-shrink-0 mt-1" />
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {!streaming && events.length === 0 && (
        <Card padding="lg">
          <div className="text-center py-12">
            <Radio className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              Live Feed Reasoning
            </h3>
            <p className="text-sm text-text-muted max-w-md mx-auto mb-4">
              Connect to any live video feed (YouTube Live, IP camera, RTSP)
              and run Cosmos Reason 2 inference on each frame in real-time.
              The model will analyze each captured frame with your prompt.
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3" /> YouTube Live
              </span>
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3" /> IP Cameras
              </span>
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3" /> HLS / RTSP
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Streaming - waiting for first frame */}
      {streaming && inferenceEvents.length === 0 && (
        <Card padding="lg">
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-accent mx-auto mb-3 animate-spin" />
            <p className="text-sm text-text-muted">
              Connecting to stream and waiting for first frame...
            </p>
            {statusEvents.length > 0 && (
              <p className="text-xs text-text-muted mt-2">
                {statusEvents[statusEvents.length - 1].message}
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
