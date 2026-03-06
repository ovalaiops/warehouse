import React from "react";
import { Card } from "@/components/common/Card";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

const safetyTrendData = [
  { day: "Mon", score: 96.2, alerts: 4 },
  { day: "Tue", score: 94.8, alerts: 7 },
  { day: "Wed", score: 97.1, alerts: 3 },
  { day: "Thu", score: 93.5, alerts: 9 },
  { day: "Fri", score: 95.3, alerts: 5 },
  { day: "Sat", score: 98.1, alerts: 2 },
  { day: "Sun", score: 99.2, alerts: 1 },
];

const alertDistribution = [
  { name: "Safety", value: 38, color: "#ff0066" },
  { name: "Inventory", value: 24, color: "#ffb800" },
  { name: "Congestion", value: 18, color: "#3b82f6" },
  { name: "Security", value: 12, color: "#8b5cf6" },
  { name: "Quality", value: 8, color: "#00ffb2" },
];

const heatmapData: { hour: string; values: number[] }[] = [
  { hour: "06:00", values: [2, 3, 1, 4, 2, 1, 0] },
  { hour: "08:00", values: [5, 7, 4, 8, 6, 3, 1] },
  { hour: "10:00", values: [8, 9, 6, 10, 7, 4, 2] },
  { hour: "12:00", values: [6, 8, 5, 7, 5, 3, 2] },
  { hour: "14:00", values: [9, 10, 7, 11, 8, 4, 2] },
  { hour: "16:00", values: [7, 8, 6, 9, 7, 3, 1] },
  { hour: "18:00", values: [4, 5, 3, 6, 4, 2, 1] },
  { hour: "20:00", values: [2, 3, 2, 3, 2, 1, 0] },
  { hour: "22:00", values: [1, 1, 1, 2, 1, 0, 0] },
];

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const zoneUtilization = [
  { zone: "Receiving", utilization: 72, capacity: 100 },
  { zone: "Storage A", utilization: 85, capacity: 100 },
  { zone: "Storage B", utilization: 91, capacity: 100 },
  { zone: "Picking", utilization: 65, capacity: 100 },
  { zone: "Shipping", utilization: 78, capacity: 100 },
  { zone: "Cold Storage", utilization: 45, capacity: 100 },
];

const tooltipStyle = {
  backgroundColor: "#17171d",
  border: "1px solid rgba(95,95,113,0.22)",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "12px",
};

const Analytics: React.FC = () => {
  const getHeatColor = (value: number): string => {
    if (value === 0) return "rgba(95,95,113,0.08)";
    if (value <= 2) return "rgba(0,255,178,0.15)";
    if (value <= 4) return "rgba(0,255,178,0.3)";
    if (value <= 6) return "rgba(255,184,0,0.3)";
    if (value <= 8) return "rgba(255,184,0,0.5)";
    return "rgba(255,0,102,0.5)";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary font-display">Analytics</h1>
        <p className="text-sm text-text-muted mt-1">
          Operational insights and trend analysis
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Safety trend */}
        <Card header={{ title: "Safety Score Trend", action: <span className="text-xs text-text-muted">This Week</span> }} padding="md">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={safetyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(95,95,113,0.12)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={{ stroke: "rgba(95,95,113,0.22)" }} tickLine={false} />
                <YAxis domain={[90, 100]} tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="score" stroke="#00ffb2" strokeWidth={2.5} dot={{ fill: "#00ffb2", strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: "#00ffb2" }} name="Safety Score" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Alert distribution */}
        <Card header={{ title: "Alert Distribution", action: <span className="text-xs text-text-muted">Last 30 Days</span> }} padding="md">
          <div className="h-64 flex items-center">
            <div className="w-1/2">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={alertDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {alertDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-2">
              {alertDistribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-text-primary font-medium">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: item.color }}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Traffic heatmap */}
        <Card header={{ title: "Traffic Heatmap by Hour", action: <span className="text-xs text-text-muted">Alerts per hour</span> }} padding="md">
          <div className="space-y-2">
            {/* Day labels */}
            <div className="flex items-center ml-14 gap-1">
              {days.map((d) => (
                <div key={d} className="flex-1 text-center text-[10px] text-text-muted">
                  {d}
                </div>
              ))}
            </div>
            {/* Heatmap grid */}
            {heatmapData.map((row) => (
              <div key={row.hour} className="flex items-center gap-1">
                <span className="text-[10px] text-text-muted w-12 text-right pr-2">
                  {row.hour}
                </span>
                {row.values.map((val, i) => (
                  <div
                    key={i}
                    className="flex-1 aspect-square rounded-sm transition-colors cursor-pointer hover:ring-1 hover:ring-accent/30"
                    style={{ backgroundColor: getHeatColor(val) }}
                    title={`${days[i]} ${row.hour}: ${val} alerts`}
                  />
                ))}
              </div>
            ))}
            {/* Legend */}
            <div className="flex items-center justify-end gap-1 mt-2">
              <span className="text-[10px] text-text-muted mr-1">Less</span>
              {[0, 2, 4, 6, 8, 10].map((v) => (
                <div
                  key={v}
                  className={cn("w-4 h-4 rounded-sm")}
                  style={{ backgroundColor: getHeatColor(v) }}
                />
              ))}
              <span className="text-[10px] text-text-muted ml-1">More</span>
            </div>
          </div>
        </Card>

        {/* Zone utilization */}
        <Card header={{ title: "Zone Utilization", action: <span className="text-xs text-text-muted">Current</span> }} padding="md">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneUtilization} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(95,95,113,0.12)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#71717a", fontSize: 11 }} axisLine={{ stroke: "rgba(95,95,113,0.22)" }} tickLine={false} />
                <YAxis type="category" dataKey="zone" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="utilization" radius={[0, 4, 4, 0]} name="Utilization %">
                  {zoneUtilization.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.utilization > 85 ? "#ff0066" : entry.utilization > 70 ? "#ffb800" : "#00ffb2"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
