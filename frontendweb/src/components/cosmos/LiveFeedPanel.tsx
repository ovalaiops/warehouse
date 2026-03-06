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
  ChevronDown,
  ChevronRight,
  Maximize2,
  X,
  ExternalLink,
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
    label: "YouTube Live (example)",
    url: "https://www.youtube.com/watch?v=ydYDqZQpim8",
    description: "Jackson Hole Town Square",
  },
  {
    label: "YouTube Live (traffic)",
    url: "https://www.youtube.com/watch?v=1EiC9bvVGnk",
    description: "Abbey Road Crossing",
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
  const [expandedFrame, setExpandedFrame] = useState<number | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest result
  useEffect(() => {
    if (feedEndRef.current && streaming) {
      feedEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [events.length, streaming]);

  const startStream = useCallback(() => {
    if (!url.trim()) return;

    setStreaming(true);
    setEvents([]);

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

        if (data.type === "ended" || data.type === "error") {
          // Don't auto-close on individual frame errors
          if (data.type === "ended") {
            es.close();
            setStreaming(false);
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      setStreaming(false);
    };
  }, [url, prompt, interval, maxFrames]);

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStreaming(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

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

      {/* URL Input + Controls */}
      <Card padding="md">
        <div className="space-y-3">
          {/* URL input */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">
              Live Feed URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="YouTube Live URL, IP camera URL, HLS .m3u8, RTSP..."
                className="flex-1 bg-surface-elevated border border-border rounded-button px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                disabled={streaming}
              />
              {!streaming ? (
                <Button
                  onClick={startStream}
                  disabled={!url.trim()}
                  className="flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Start
                </Button>
              ) : (
                <Button
                  onClick={stopStream}
                  variant="secondary"
                  className="flex items-center gap-2 !border-critical/30 !text-critical hover:!bg-critical/10"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </Button>
              )}
            </div>
          </div>

          {/* Quick URL buttons */}
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

          {/* Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-text-secondary">
                Prompt (applied to each frame)
              </label>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-[10px] text-text-muted hover:text-accent"
              >
                {showSettings ? "Hide" : "Show"} Settings
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              className="w-full bg-surface-elevated border border-border rounded-button px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
              disabled={streaming}
            />
            {/* Quick prompt buttons */}
            {!streaming && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {DEFAULT_PROMPTS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setPrompt(p.prompt)}
                    className={cn(
                      "px-2 py-0.5 text-[10px] rounded border transition-colors",
                      prompt === p.prompt
                        ? "bg-accent/10 text-accent border-accent/30"
                        : "border-border text-text-muted hover:text-text-secondary"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
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

      {/* Live Stats Bar */}
      {events.length > 0 && (
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
      )}

      {/* Results Feed */}
      {inferenceEvents.length > 0 && (
        <Card
          header={{
            title: (
              <span className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-accent" />
                Live Inference Results
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
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {inferenceEvents.map((event, idx) => {
              const isExpanded = expandedFrame === idx;
              return (
                <div
                  key={idx}
                  className="bg-surface-elevated rounded-button border border-border overflow-hidden"
                >
                  {/* Frame header */}
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-surface"
                    onClick={() =>
                      setExpandedFrame(isExpanded ? null : idx)
                    }
                  >
                    {/* Thumbnail */}
                    {event.frame_base64 && (
                      <div
                        className="w-16 h-12 rounded overflow-hidden flex-shrink-0 cursor-zoom-in"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxSrc(
                            `data:image/jpeg;base64,${event.frame_base64}`
                          );
                        }}
                      >
                        <img
                          src={`data:image/jpeg;base64,${event.frame_base64}`}
                          alt={`Frame ${event.frame_number}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-text-primary">
                          Frame #{event.frame_number}
                        </span>
                        <Badge variant="info">
                          {event.processing_time_ms}ms
                        </Badge>
                        <span className="text-[10px] text-text-muted">
                          {new Date(
                            event.timestamp * 1000
                          ).toLocaleTimeString()}
                        </span>
                      </div>
                      {/* One-line summary from reasoning */}
                      {event.reasoning && (
                        <p className="text-[11px] text-text-muted truncate mt-0.5">
                          {event.reasoning.slice(0, 150)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {event.frame_base64 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxSrc(
                              `data:image/jpeg;base64,${event.frame_base64}`
                            );
                          }}
                          className="text-text-muted hover:text-accent"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-text-muted" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-text-muted" />
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-border p-3 space-y-3">
                      {/* Full frame */}
                      {event.frame_base64 && (
                        <div
                          className="cursor-zoom-in"
                          onClick={() =>
                            setLightboxSrc(
                              `data:image/jpeg;base64,${event.frame_base64}`
                            )
                          }
                        >
                          <img
                            src={`data:image/jpeg;base64,${event.frame_base64}`}
                            alt={`Frame ${event.frame_number}`}
                            className="w-full max-h-64 object-contain rounded"
                          />
                        </div>
                      )}

                      {/* Reasoning */}
                      {event.reasoning && (
                        <div>
                          <p className="text-[10px] font-medium text-text-secondary mb-1">
                            Reasoning
                          </p>
                          <p className="text-xs text-text-muted whitespace-pre-wrap bg-surface p-2 rounded max-h-32 overflow-y-auto">
                            {event.reasoning}
                          </p>
                        </div>
                      )}

                      {/* Structured result */}
                      {event.result &&
                        Object.keys(event.result).length > 0 && (
                          <div>
                            <p className="text-[10px] font-medium text-text-secondary mb-1">
                              Structured Output
                            </p>
                            <pre className="text-[10px] text-text-muted bg-surface p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                              {JSON.stringify(event.result, null, 2)}
                            </pre>
                          </div>
                        )}

                      {/* Raw output */}
                      {event.raw_output && (
                        <div>
                          <p className="text-[10px] font-medium text-text-secondary mb-1">
                            Raw Output
                          </p>
                          <pre className="text-[10px] text-text-muted bg-surface p-2 rounded overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap">
                            {event.raw_output}
                          </pre>
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-[10px] text-text-muted">
                        <span>Model: {event.model}</span>
                        <span>Latency: {event.processing_time_ms}ms</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={feedEndRef} />
          </div>
        </Card>
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

      {/* Streaming indicator */}
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
