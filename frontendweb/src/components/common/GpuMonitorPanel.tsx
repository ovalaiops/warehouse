import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import {
  Activity,
  DollarSign,
  Clock,
  Cpu,
  Power,
  PowerOff,
  Brain,
  Settings2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MonitoringData = any;

interface GpuMonitorPanelProps {
  /** Show expanded config section by default */
  showConfig?: boolean;
}

export const GpuMonitorPanel: React.FC<GpuMonitorPanelProps> = ({
  showConfig: initialShowConfig = false,
}) => {
  const [showConfig, setShowConfig] = useState(initialShowConfig);
  const [idleThreshold, setIdleThreshold] = useState(5); // minutes
  const [autoShutdown, setAutoShutdown] = useState(true);
  const [gpuToggleOverride, setGpuToggleOverride] = useState<boolean | null>(null);
  const queryClient = useQueryClient();

  const { data: monitoringData, isLoading } = useQuery<MonitoringData>({
    queryKey: ["monitoring"],
    queryFn: async () => {
      const res = await fetch("/monitoring");
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 10000,
  });

  const nimOnline = monitoringData?.nim?.status === "online";
  // Reflect actual server state unless user just toggled (override resets on next data fetch)
  const gpuEnabled = gpuToggleOverride ?? nimOnline;

  const handleGpuToggle = async () => {
    const newState = !gpuEnabled;
    setGpuToggleOverride(newState);
    try {
      await fetch("/monitoring/gpu-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newState }),
      });
    } catch {
      // Endpoint may not exist yet — toggle is best-effort
    }
    // Reset override after re-fetch so it reflects real state
    setTimeout(() => {
      setGpuToggleOverride(null);
      queryClient.invalidateQueries({ queryKey: ["monitoring"] });
    }, 3000);
  };

  const handleAutoShutdownToggle = () => {
    setAutoShutdown(!autoShutdown);
  };

  if (isLoading && !monitoringData) {
    return (
      <Card padding="sm">
        <div className="flex items-center justify-center h-24 text-text-muted text-sm">
          <Cpu className="w-4 h-4 animate-pulse mr-2" /> Loading GPU metrics...
        </div>
      </Card>
    );
  }

  if (!monitoringData) {
    return (
      <Card padding="sm">
        <div className="flex items-center justify-center h-24 text-text-muted text-sm">
          <PowerOff className="w-4 h-4 mr-2" /> GPU monitoring unavailable
        </div>
      </Card>
    );
  }

  const idleSeconds = monitoringData.inference?.idle_seconds || 0;
  const idleWarning = idleSeconds >= (idleThreshold * 60 - 60); // warn 1 min before threshold

  return (
    <div className="space-y-4">
      <Card
        header={{
          title: (
            <span className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-accent" />
              GPU Server Monitoring
              {nimOnline ? (
                <Badge variant="success" dot>Online</Badge>
              ) : (
                <Badge variant="critical" dot>Offline</Badge>
              )}
            </span>
          ),
          action: (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border transition-colors",
                  showConfig
                    ? "bg-accent/10 text-accent border-accent/30"
                    : "text-text-muted border-border hover:text-text-secondary"
                )}
              >
                <Settings2 className="w-3 h-3" />
                Config
              </button>
              <span className="text-[10px] text-text-muted">
                Auto-refresh 10s
              </span>
            </div>
          ),
        }}
        padding="sm"
      >
        {/* Metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Cost */}
          <div className="p-3 bg-surface-elevated rounded-button border border-border text-center">
            <DollarSign className="w-4 h-4 text-warning mx-auto mb-1" />
            <p className="text-lg font-bold text-warning">
              ${monitoringData.inference?.estimated_cost_usd?.toFixed(2) || "0.00"}
            </p>
            <p className="text-[10px] text-text-muted">Session Cost</p>
            <p className="text-[9px] text-text-muted">${monitoringData.inference?.cost_per_hour_usd}/hr</p>
          </div>

          {/* Requests */}
          <div className="p-3 bg-surface-elevated rounded-button border border-border text-center">
            <Activity className="w-4 h-4 text-accent mx-auto mb-1" />
            <p className="text-lg font-bold text-accent">
              {monitoringData.inference?.total_requests || 0}
            </p>
            <p className="text-[10px] text-text-muted">Total Requests</p>
            <p className="text-[9px] text-text-muted">{monitoringData.inference?.errors || 0} errors</p>
          </div>

          {/* Avg Latency */}
          <div className="p-3 bg-surface-elevated rounded-button border border-border text-center">
            <Clock className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-blue-400">
              {monitoringData.inference?.avg_latency_ms ? `${Math.round(monitoringData.inference.avg_latency_ms)}` : "—"}
            </p>
            <p className="text-[10px] text-text-muted">Avg Latency (ms)</p>
          </div>

          {/* Tokens */}
          <div className="p-3 bg-surface-elevated rounded-button border border-border text-center">
            <Brain className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-purple-400">
              {(monitoringData.inference?.total_tokens || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-text-muted">Total Tokens</p>
          </div>

          {/* GPU Cache */}
          <div className="p-3 bg-surface-elevated rounded-button border border-border text-center">
            <Cpu className="w-4 h-4 text-green-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-400">
              {monitoringData.nim?.gpu_cache_usage_pct ?? "—"}%
            </p>
            <p className="text-[10px] text-text-muted">GPU Cache</p>
            <p className="text-[9px] text-text-muted">KV: {monitoringData.nim?.kv_cache_usage_pct ?? "—"}%</p>
          </div>

          {/* Idle / Auto-shutdown */}
          <div className={cn(
            "p-3 rounded-button border text-center",
            idleWarning
              ? "bg-critical/5 border-critical/20"
              : "bg-surface-elevated border-border"
          )}>
            {idleWarning ? (
              <PowerOff className="w-4 h-4 text-critical mx-auto mb-1" />
            ) : (
              <Power className="w-4 h-4 text-accent mx-auto mb-1" />
            )}
            <p className={cn(
              "text-lg font-bold",
              idleWarning ? "text-critical" : "text-text-primary"
            )}>
              {Math.floor(idleSeconds / 60)}m {Math.floor(idleSeconds % 60)}s
            </p>
            <p className="text-[10px] text-text-muted">Idle Time</p>
            <p className="text-[9px] text-text-muted">
              Shutdown at {idleThreshold}m
            </p>
          </div>
        </div>

        {/* Request breakdown by task */}
        {monitoringData.inference?.requests_by_task && Object.keys(monitoringData.inference.requests_by_task).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(monitoringData.inference.requests_by_task as Record<string, number>).map(([task, count]) => (
              <Badge key={task} variant="info">
                {task}: {count}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Config panel */}
      {showConfig && (
        <Card
          header={{
            title: (
              <span className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-text-secondary" />
                GPU Configuration
              </span>
            ),
          }}
          padding="sm"
        >
          <div className="space-y-4">
            {/* Manual GPU toggle */}
            <div className={cn(
              "flex items-center justify-between p-3 rounded-button border",
              gpuEnabled
                ? "bg-accent/5 border-accent/20"
                : "bg-critical/5 border-critical/20"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  gpuEnabled ? "bg-accent/10" : "bg-critical/10"
                )}>
                  {gpuEnabled ? (
                    <Power className="w-5 h-5 text-accent" />
                  ) : (
                    <PowerOff className="w-5 h-5 text-critical" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">GPU Server (NVIDIA L40S)</p>
                  <p className={cn(
                    "text-xs font-medium",
                    gpuEnabled ? "text-accent" : "text-critical"
                  )}>
                    {gpuEnabled ? "Running on Brev — $1.78/hr" : "Server is offline"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleGpuToggle}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-button text-xs font-bold border transition-all",
                  gpuEnabled
                    ? "bg-critical/10 text-critical border-critical/30 hover:bg-critical/20"
                    : "bg-accent/10 text-accent border-accent/30 hover:bg-accent/20"
                )}
                title={gpuEnabled ? "Stop GPU server" : "Start GPU server"}
              >
                {gpuEnabled ? (
                  <>
                    <PowerOff className="w-4 h-4" />
                    STOP
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4" />
                    START
                  </>
                )}
              </button>
            </div>

            {/* Auto-shutdown toggle */}
            <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-button border border-border">
              <div>
                <p className="text-sm font-medium text-text-primary">Auto-Shutdown</p>
                <p className="text-xs text-text-muted">
                  Automatically stop GPU after idle period to save costs
                </p>
              </div>
              <button
                onClick={handleAutoShutdownToggle}
                className="flex items-center gap-2"
              >
                {autoShutdown ? (
                  <ToggleRight className="w-8 h-8 text-accent" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-text-muted" />
                )}
                <span className={cn(
                  "text-xs font-medium",
                  autoShutdown ? "text-accent" : "text-text-muted"
                )}>
                  {autoShutdown ? "ON" : "OFF"}
                </span>
              </button>
            </div>

            {/* Idle threshold slider */}
            {autoShutdown && (
              <div className="p-3 bg-surface-elevated rounded-button border border-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-text-primary">Idle Shutdown Threshold</p>
                  <span className="text-sm font-bold text-accent">{idleThreshold} min</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={idleThreshold}
                  onChange={(e) => setIdleThreshold(Number(e.target.value))}
                  className="w-full h-1.5 bg-border rounded-full appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between text-[10px] text-text-muted mt-1">
                  <span>1 min</span>
                  <span>5 min</span>
                  <span>15 min</span>
                  <span>30 min</span>
                </div>
              </div>
            )}

            {/* Uptime info */}
            <div className="flex items-center gap-4 px-3 py-2 text-xs text-text-muted">
              <span>
                Uptime: {Math.floor((monitoringData.inference?.uptime_seconds || 0) / 3600)}h{" "}
                {Math.floor(((monitoringData.inference?.uptime_seconds || 0) % 3600) / 60)}m
              </span>
              <span>
                Last request: {monitoringData.inference?.last_request_at
                  ? new Date(monitoringData.inference.last_request_at * 1000).toLocaleTimeString()
                  : "None"}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
