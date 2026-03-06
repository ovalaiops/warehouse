import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/common/Card";
import { StatCard } from "@/components/common/StatCard";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import {
  Activity,
  Server,
  Database,
  Wifi,
  Clock,
  Cpu,
  HardDrive,
  Zap,
  AlertCircle,
  RefreshCw,
  Globe,
  Webhook,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ---------------------------------------------------------------------------
// Admin API helpers
// ---------------------------------------------------------------------------

const ADMIN_BASE =
  import.meta.env.VITE_API_URL?.replace("/api/v1", "") || "";

async function adminFetch<T>(path: string): Promise<T> {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${ADMIN_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`Admin API error: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "down";
  latency: number;
  lastChecked: string;
}

interface AdminMetrics {
  totalRequests: number;
  errorRate: number;
  avgLatency: number;
  activeWS: number;
  uptime: string;
  goroutines: number;
  trends: {
    totalRequests: number;
    errorRate: number;
    avgLatency: number;
    activeWS: number;
  };
}

interface EndpointStat {
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  requests: number;
  errors: number;
  avgLatency: number;
  maxLatency: number;
}

interface RequestLog {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  latency: number;
  remoteIP: string;
}

interface EventStats {
  types: { name: string; count: number }[];
  dropped: number;
}

interface WebhookStat {
  type: string;
  received: number;
  succeeded: number;
  failed: number;
  successRate: number;
  lastReceived: string;
}

interface SystemMetrics {
  memAlloc: number;
  memSys: number;
  goroutines: number;
  gcPauseMs: number;
  heapObjects: number;
}

// ---------------------------------------------------------------------------
// Mock / fallback data
// ---------------------------------------------------------------------------

const mockHealth: ServiceHealth[] = [
  { name: "API Server", status: "healthy", latency: 12, lastChecked: new Date().toISOString() },
  { name: "Inference Service", status: "healthy", latency: 45, lastChecked: new Date().toISOString() },
  { name: "Database", status: "degraded", latency: 120, lastChecked: new Date().toISOString() },
  { name: "Event Bus", status: "healthy", latency: 8, lastChecked: new Date().toISOString() },
];

const mockMetrics: AdminMetrics = {
  totalRequests: 1_284_392,
  errorRate: 0.42,
  avgLatency: 34,
  activeWS: 127,
  uptime: "14d 7h 32m",
  goroutines: 1842,
  trends: { totalRequests: 12.3, errorRate: -0.08, avgLatency: -2.1, activeWS: 5.4 },
};

function generateTrafficData() {
  const data = [];
  const now = Date.now();
  for (let i = 59; i >= 0; i--) {
    const t = new Date(now - i * 60_000);
    const base = 200 + Math.sin(i / 10) * 80;
    data.push({
      time: `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`,
      requests: Math.round(base + Math.random() * 60),
      errors: Math.round(Math.random() * 8),
    });
  }
  return data;
}

const mockEndpoints: EndpointStat[] = [
  { endpoint: "/api/v1/alerts", method: "GET", requests: 48210, errors: 12, avgLatency: 23, maxLatency: 142 },
  { endpoint: "/api/v1/inventory", method: "GET", requests: 35890, errors: 5, avgLatency: 45, maxLatency: 310 },
  { endpoint: "/api/v1/fleet/position", method: "POST", requests: 29100, errors: 87, avgLatency: 78, maxLatency: 520 },
  { endpoint: "/api/v1/cameras/feed", method: "GET", requests: 22450, errors: 3, avgLatency: 112, maxLatency: 890 },
  { endpoint: "/api/v1/alerts", method: "POST", requests: 18300, errors: 45, avgLatency: 56, maxLatency: 340 },
  { endpoint: "/api/v1/inventory/scan", method: "PUT", requests: 12780, errors: 22, avgLatency: 67, maxLatency: 450 },
  { endpoint: "/api/v1/fleet", method: "DELETE", requests: 890, errors: 2, avgLatency: 34, maxLatency: 180 },
  { endpoint: "/api/v1/reports/generate", method: "POST", requests: 4560, errors: 120, avgLatency: 540, maxLatency: 2100 },
];

const mockStatusCodes = [
  { name: "2xx", value: 92, color: "#00ffb2" },
  { name: "3xx", value: 3, color: "#3b82f6" },
  { name: "4xx", value: 4, color: "#ffb800" },
  { name: "5xx", value: 1, color: "#ff0066" },
];

const mockLogs: RequestLog[] = Array.from({ length: 50 }, (_, i) => {
  const methods = ["GET", "POST", "PUT", "DELETE"];
  const paths = ["/api/v1/alerts", "/api/v1/inventory", "/api/v1/fleet", "/api/v1/cameras", "/api/v1/reports"];
  const statuses = [200, 200, 200, 201, 204, 301, 400, 404, 500];
  return {
    timestamp: new Date(Date.now() - i * 12_000).toISOString(),
    method: methods[Math.floor(Math.random() * methods.length)],
    path: paths[Math.floor(Math.random() * paths.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    latency: Math.round(Math.random() * 400 + 5),
    remoteIP: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
  };
});

const mockEvents: EventStats = {
  types: [
    { name: "alert.created", count: 1284 },
    { name: "alert.acknowledged", count: 1102 },
    { name: "alert.resolved", count: 987 },
    { name: "inventory.updated", count: 4520 },
    { name: "fleet.updated", count: 3210 },
    { name: "scan.completed", count: 2180 },
  ],
  dropped: 3,
};

const mockWebhooks: WebhookStat[] = [
  { type: "alert.created", received: 1284, succeeded: 1270, failed: 14, successRate: 98.9, lastReceived: "2m ago" },
  { type: "alert.resolved", received: 987, succeeded: 985, failed: 2, successRate: 99.8, lastReceived: "5m ago" },
  { type: "inventory.updated", received: 4520, succeeded: 4480, failed: 40, successRate: 99.1, lastReceived: "30s ago" },
  { type: "scan.completed", received: 2180, succeeded: 2150, failed: 30, successRate: 98.6, lastReceived: "1m ago" },
];

const mockSystem: SystemMetrics = {
  memAlloc: 142,
  memSys: 512,
  goroutines: 1842,
  gcPauseMs: 1.23,
  heapObjects: 1_240_000,
};

// ---------------------------------------------------------------------------
// Tooltip style
// ---------------------------------------------------------------------------

const tooltipStyle = {
  backgroundColor: "#17171d",
  border: "1px solid rgba(95,95,113,0.22)",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "12px",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const statusColors = {
  healthy: { bg: "bg-accent/10", text: "text-accent", dot: "bg-accent", shadow: "shadow-[0_0_10px_rgba(0,255,178,0.3)]" },
  degraded: { bg: "bg-warning/10", text: "text-warning", dot: "bg-warning", shadow: "shadow-[0_0_10px_rgba(255,184,0,0.3)]" },
  down: { bg: "bg-critical/10", text: "text-critical", dot: "bg-critical", shadow: "shadow-[0_0_10px_rgba(255,0,102,0.3)]" },
};

const serviceIcons: Record<string, React.ElementType> = {
  "API Server": Globe,
  "Inference Service": Cpu,
  Database: Database,
  "Event Bus": Zap,
};

function ServiceHealthCard({ service }: { service: ServiceHealth }) {
  const colors = statusColors[service.status];
  const Icon = serviceIcons[service.name] || Server;
  return (
    <div className="bg-surface border border-border rounded-card p-4 hover:border-accent/20 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-button bg-surface-elevated text-text-secondary">
            <Icon className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold text-text-primary">{service.name}</span>
        </div>
        <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-button text-xs font-medium", colors.bg, colors.text)}>
          <span className={cn("w-2 h-2 rounded-full animate-pulse", colors.dot, colors.shadow)} />
          {service.status}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">Latency: <span className="text-text-secondary">{service.latency}ms</span></span>
        <span className="text-text-muted">
          <Clock className="w-3 h-3 inline mr-1" />
          {new Date(service.lastChecked).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

const methodColors: Record<string, string> = {
  GET: "bg-info/20 text-info",
  POST: "bg-accent/20 text-accent",
  PUT: "bg-warning/20 text-warning",
  DELETE: "bg-critical/20 text-critical",
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span className={cn("px-2 py-0.5 rounded-button text-[10px] font-bold tracking-wider", methodColors[method] || "bg-surface-elevated text-text-secondary")}>
      {method}
    </span>
  );
}

function StatusBadge({ status }: { status: number }) {
  let color = "bg-accent/20 text-accent";
  if (status >= 300 && status < 400) color = "bg-info/20 text-info";
  else if (status >= 400 && status < 500) color = "bg-warning/20 text-warning";
  else if (status >= 500) color = "bg-critical/20 text-critical";
  return (
    <span className={cn("px-2 py-0.5 rounded-button text-[10px] font-bold", color)}>
      {status}
    </span>
  );
}

function latencyColor(ms: number) {
  if (ms < 100) return "text-accent";
  if (ms < 500) return "text-warning";
  return "text-critical";
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const Admin: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<"all" | "2xx" | "4xx" | "5xx">("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sortField, setSortField] = useState<keyof EndpointStat>("requests");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Queries with fallback to mock data
  const { data: health } = useQuery<ServiceHealth[]>({
    queryKey: ["admin", "health"],
    queryFn: () => adminFetch<ServiceHealth[]>("/admin/health"),
    refetchInterval: autoRefresh ? 10_000 : false,
    placeholderData: mockHealth,
  });

  const { data: metrics } = useQuery<AdminMetrics>({
    queryKey: ["admin", "metrics"],
    queryFn: () => adminFetch<AdminMetrics>("/admin/metrics"),
    refetchInterval: autoRefresh ? 10_000 : false,
    placeholderData: mockMetrics,
  });

  const { data: requestLogs } = useQuery<RequestLog[]>({
    queryKey: ["admin", "requests"],
    queryFn: () => adminFetch<RequestLog[]>("/admin/requests?limit=50"),
    refetchInterval: autoRefresh ? 10_000 : false,
    placeholderData: mockLogs,
  });

  const { data: events } = useQuery<EventStats>({
    queryKey: ["admin", "events"],
    queryFn: () => adminFetch<EventStats>("/admin/events"),
    refetchInterval: autoRefresh ? 10_000 : false,
    placeholderData: mockEvents,
  });

  const { data: webhooks } = useQuery<WebhookStat[]>({
    queryKey: ["admin", "webhooks"],
    queryFn: () => adminFetch<WebhookStat[]>("/admin/webhooks"),
    refetchInterval: autoRefresh ? 10_000 : false,
    placeholderData: mockWebhooks,
  });

  const { data: system } = useQuery<SystemMetrics>({
    queryKey: ["admin", "system"],
    queryFn: () => adminFetch<SystemMetrics>("/admin/system"),
    refetchInterval: autoRefresh ? 10_000 : false,
    placeholderData: mockSystem,
  });

  const trafficData = useMemo(() => generateTrafficData(), []);

  const filteredLogs = useMemo(() => {
    if (!requestLogs) return [];
    if (statusFilter === "all") return requestLogs;
    const base = statusFilter === "2xx" ? 200 : statusFilter === "4xx" ? 400 : 500;
    return requestLogs.filter((l) => l.status >= base && l.status < base + 100);
  }, [requestLogs, statusFilter]);

  const sortedEndpoints = useMemo(() => {
    const list = [...mockEndpoints];
    list.sort((a, b) => {
      const av = a[sortField] as number;
      const bv = b[sortField] as number;
      if (typeof av === "string") return sortDir === "asc" ? (av as string).localeCompare(bv as unknown as string) : (bv as unknown as string).localeCompare(av as string);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list;
  }, [sortField, sortDir]);

  function toggleSort(field: keyof EndpointStat) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  }

  const m = metrics ?? mockMetrics;
  const h = health ?? mockHealth;
  const ev = events ?? mockEvents;
  const wh = webhooks ?? mockWebhooks;
  const sys = system ?? mockSystem;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
          <p className="text-sm text-text-muted mt-1">System health, traffic, and operations monitoring</p>
        </div>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-button text-xs font-medium transition-colors",
            autoRefresh ? "bg-accent/10 text-accent" : "bg-surface-elevated text-text-muted"
          )}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", autoRefresh && "animate-spin")} style={autoRefresh ? { animationDuration: "3s" } : undefined} />
          {autoRefresh ? "Live" : "Paused"}
        </button>
      </div>

      {/* 1. Service Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {h.map((s) => (
          <ServiceHealthCard key={s.name} service={s} />
        ))}
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={Activity}
          label="Total Requests"
          value={m.totalRequests.toLocaleString()}
          trend={{ value: m.trends.totalRequests, direction: "up" }}
        />
        <StatCard
          icon={AlertCircle}
          label="Error Rate"
          value={`${m.errorRate}%`}
          trend={{ value: Math.abs(m.trends.errorRate), direction: m.trends.errorRate < 0 ? "down" : "up" }}
          accentHighlight={m.errorRate > 1}
        />
        <StatCard
          icon={Clock}
          label="Avg Latency"
          value={`${m.avgLatency}ms`}
          trend={{ value: Math.abs(m.trends.avgLatency), direction: m.trends.avgLatency < 0 ? "down" : "up" }}
        />
        <StatCard
          icon={Wifi}
          label="Active WS"
          value={m.activeWS}
          trend={{ value: m.trends.activeWS, direction: "up" }}
        />
        <StatCard icon={Server} label="Uptime" value={m.uptime} />
        <StatCard icon={Cpu} label="Goroutines" value={m.goroutines.toLocaleString()} />
      </div>

      {/* 3. Traffic Chart + 5. Status Codes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <Card header={{ title: "Request Traffic", action: <span className="text-xs text-text-muted">Last 60 min</span> }} padding="md">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficData}>
                  <defs>
                    <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ffb2" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#00ffb2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(95,95,113,0.12)" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={{ stroke: "rgba(95,95,113,0.22)" }} tickLine={false} interval={9} />
                  <YAxis yAxisId="left" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area yAxisId="left" type="monotone" dataKey="requests" stroke="#00ffb2" strokeWidth={2} fill="url(#trafficGrad)" name="Requests/min" />
                  <Line yAxisId="right" type="monotone" dataKey="errors" stroke="#ff0066" strokeWidth={2} dot={false} name="Errors" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-4">
          <Card header={{ title: "Status Codes", action: <span className="text-xs text-text-muted">Distribution</span> }} padding="md">
            <div className="h-72 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={mockStatusCodes} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {mockStatusCodes.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {mockStatusCodes.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-text-secondary">{s.name}</span>
                    <span className="text-xs font-medium text-text-primary">{s.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 4. Top Endpoints Table */}
      <Card header={{ title: "Top Endpoints", action: <span className="text-xs text-text-muted">{mockEndpoints.length} endpoints</span> }} padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                {(
                  [
                    ["endpoint", "Endpoint"],
                    ["method", "Method"],
                    ["requests", "Requests"],
                    ["errors", "Errors"],
                    ["avgLatency", "Avg Latency"],
                    ["maxLatency", "Max Latency"],
                  ] as [keyof EndpointStat, string][]
                ).map(([field, label]) => (
                  <th
                    key={field}
                    className="px-4 py-3 text-left cursor-pointer hover:text-text-primary transition-colors select-none"
                    onClick={() => toggleSort(field)}
                  >
                    <span className="flex items-center gap-1">
                      {label}
                      {sortField === field && (
                        sortDir === "desc" ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedEndpoints.map((ep, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-surface-elevated/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-text-primary text-xs">{ep.endpoint}</td>
                  <td className="px-4 py-3"><MethodBadge method={ep.method} /></td>
                  <td className="px-4 py-3 text-text-secondary">{ep.requests.toLocaleString()}</td>
                  <td className="px-4 py-3 text-text-secondary">{ep.errors}</td>
                  <td className={cn("px-4 py-3 font-medium", latencyColor(ep.avgLatency))}>{ep.avgLatency}ms</td>
                  <td className={cn("px-4 py-3 font-medium", latencyColor(ep.maxLatency))}>{ep.maxLatency}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 6. Request Logs + 7. Events Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <Card
            header={{
              title: "Recent Request Logs",
              action: (
                <div className="flex items-center gap-2">
                  {(["all", "2xx", "4xx", "5xx"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={cn(
                        "px-2 py-1 rounded-button text-[10px] font-medium transition-colors",
                        statusFilter === f ? "bg-accent/10 text-accent" : "bg-surface-elevated text-text-muted hover:text-text-secondary"
                      )}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              ),
            }}
            padding="none"
          >
            <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface z-10">
                  <tr className="border-b border-border text-text-muted uppercase tracking-wider">
                    <th className="px-4 py-2 text-left">Time</th>
                    <th className="px-4 py-2 text-left">Method</th>
                    <th className="px-4 py-2 text-left">Path</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Latency</th>
                    <th className="px-4 py-2 text-left">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-surface-elevated/30 transition-colors">
                      <td className="px-4 py-2 text-text-muted font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-2"><MethodBadge method={log.method} /></td>
                      <td className="px-4 py-2 text-text-secondary font-mono">{log.path}</td>
                      <td className="px-4 py-2"><StatusBadge status={log.status} /></td>
                      <td className={cn("px-4 py-2 font-medium", latencyColor(log.latency))}>{log.latency}ms</td>
                      <td className="px-4 py-2 text-text-muted font-mono">{log.remoteIP}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* 7. Events Panel */}
        <div className="lg:col-span-4">
          <Card header={{ title: "Events", action: ev.dropped > 0 ? <span className="text-xs text-critical font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />{ev.dropped} dropped</span> : undefined }} padding="md">
            <div className="space-y-3">
              {ev.types.map((evt) => (
                <div key={evt.name} className="flex items-center justify-between p-2.5 rounded-button bg-surface-elevated/50 hover:bg-surface-elevated transition-colors">
                  <span className="text-xs text-text-secondary font-mono">{evt.name}</span>
                  <span className="text-sm font-bold text-text-primary">{evt.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* 8. Webhooks + 9. System Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <Card header={{ title: "Webhook Delivery Stats", action: <Webhook className="w-4 h-4 text-text-muted" /> }} padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Received</th>
                    <th className="px-4 py-3 text-left">Succeeded</th>
                    <th className="px-4 py-3 text-left">Failed</th>
                    <th className="px-4 py-3 text-left">Success Rate</th>
                    <th className="px-4 py-3 text-left">Last Received</th>
                  </tr>
                </thead>
                <tbody>
                  {wh.map((w, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-surface-elevated/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-text-primary text-xs">{w.type}</td>
                      <td className="px-4 py-3 text-text-secondary">{w.received.toLocaleString()}</td>
                      <td className="px-4 py-3 text-accent">{w.succeeded.toLocaleString()}</td>
                      <td className="px-4 py-3 text-critical">{w.failed}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${w.successRate}%`,
                                backgroundColor: w.successRate >= 99 ? "#00ffb2" : w.successRate >= 95 ? "#ffb800" : "#ff0066",
                              }}
                            />
                          </div>
                          <span className="text-xs text-text-secondary w-12 text-right">{w.successRate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-muted text-xs">{w.lastReceived}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* 9. System Metrics */}
        <div className="lg:col-span-4">
          <Card header={{ title: "System Metrics", action: <HardDrive className="w-4 h-4 text-text-muted" /> }} padding="md">
            <div className="space-y-5">
              {/* Memory */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-text-muted">Memory Usage</span>
                  <span className="text-xs text-text-secondary">{sys.memAlloc}MB / {sys.memSys}MB</span>
                </div>
                <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(sys.memAlloc / sys.memSys) * 100}%`,
                      backgroundColor: sys.memAlloc / sys.memSys > 0.8 ? "#ff0066" : sys.memAlloc / sys.memSys > 0.6 ? "#ffb800" : "#00ffb2",
                    }}
                  />
                </div>
              </div>

              {/* Goroutines */}
              <div className="flex items-center justify-between p-3 rounded-button bg-surface-elevated/50">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-accent" />
                  <span className="text-xs text-text-muted">Goroutines</span>
                </div>
                <span className="text-sm font-bold text-text-primary">{sys.goroutines.toLocaleString()}</span>
              </div>

              {/* GC Pause */}
              <div className="flex items-center justify-between p-3 rounded-button bg-surface-elevated/50">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-warning" />
                  <span className="text-xs text-text-muted">GC Pause</span>
                </div>
                <span className="text-sm font-bold text-text-primary">{sys.gcPauseMs}ms</span>
              </div>

              {/* Heap Objects */}
              <div className="flex items-center justify-between p-3 rounded-button bg-surface-elevated/50">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-info" />
                  <span className="text-xs text-text-muted">Heap Objects</span>
                </div>
                <span className="text-sm font-bold text-text-primary">{(sys.heapObjects / 1_000_000).toFixed(2)}M</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;
