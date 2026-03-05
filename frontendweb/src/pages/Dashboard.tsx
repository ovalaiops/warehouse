import React from "react";
import { StatCard } from "@/components/common/StatCard";
import { Card } from "@/components/common/Card";
import { AlertFeed } from "@/components/dashboard/AlertFeed";
import { CameraGrid } from "@/components/dashboard/CameraGrid";
import { FleetMap } from "@/components/dashboard/FleetMap";
import { AlertTriangle, ShieldCheck, Package, Truck } from "lucide-react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

const analyticsData = [
  { hour: "00:00", alerts: 2, safety: 98, throughput: 45 },
  { hour: "02:00", alerts: 1, safety: 99, throughput: 32 },
  { hour: "04:00", alerts: 0, safety: 100, throughput: 28 },
  { hour: "06:00", alerts: 3, safety: 96, throughput: 62 },
  { hour: "08:00", alerts: 7, safety: 91, throughput: 120 },
  { hour: "10:00", alerts: 5, safety: 93, throughput: 145 },
  { hour: "12:00", alerts: 4, safety: 94, throughput: 130 },
  { hour: "14:00", alerts: 8, safety: 89, throughput: 155 },
  { hour: "16:00", alerts: 6, safety: 92, throughput: 140 },
  { hour: "18:00", alerts: 3, safety: 96, throughput: 95 },
  { hour: "20:00", alerts: 2, safety: 97, throughput: 65 },
  { hour: "22:00", alerts: 1, safety: 99, throughput: 42 },
];

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Operations Dashboard
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Real-time warehouse monitoring and intelligence
        </p>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={AlertTriangle}
          label="Active Alerts"
          value={12}
          trend={{ value: 15.3, direction: "up" }}
          accentHighlight
        />
        <StatCard
          icon={ShieldCheck}
          label="Safety Score"
          value="94.2%"
          trend={{ value: 2.1, direction: "up" }}
        />
        <StatCard
          icon={Package}
          label="Inventory Accuracy"
          value="99.1%"
          trend={{ value: 0.3, direction: "up" }}
        />
        <StatCard
          icon={Truck}
          label="Fleet Utilization"
          value="78%"
          trend={{ value: 5.2, direction: "down" }}
        />
      </div>

      {/* Middle row: Alert Feed + Camera Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card
            header={{
              title: "Real-Time Alert Feed",
              action: (
                <span className="text-xs text-accent font-medium">
                  5 new alerts
                </span>
              ),
            }}
            padding="sm"
          >
            <AlertFeed />
          </Card>
        </div>
        <div>
          <Card
            header={{
              title: "Camera Feeds",
              action: (
                <span className="text-xs text-text-muted">4 active</span>
              ),
            }}
            padding="sm"
          >
            <CameraGrid columns={2} />
          </Card>
        </div>
      </div>

      {/* Bottom row: Fleet Map + Analytics Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          header={{
            title: "Fleet Overview",
            action: (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <span className="text-xs text-text-muted">Active</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-text-muted" />
                  <span className="text-xs text-text-muted">Idle</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-info" />
                  <span className="text-xs text-text-muted">Charging</span>
                </div>
              </div>
            ),
          }}
          padding="sm"
        >
          <FleetMap />
        </Card>

        <Card
          header={{
            title: "Operations Analytics",
            action: (
              <span className="text-xs text-text-muted">Last 24h</span>
            ),
          }}
          padding="md"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData}>
                <defs>
                  <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff0066" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ff0066" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ffb2" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00ffb2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(95,95,113,0.12)"
                  vertical={false}
                />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(95,95,113,0.22)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#17171d",
                    border: "1px solid rgba(95,95,113,0.22)",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="throughput"
                  stroke="#00ffb2"
                  strokeWidth={2}
                  fill="url(#colorThroughput)"
                  name="Throughput"
                />
                <Line
                  type="monotone"
                  dataKey="alerts"
                  stroke="#ff0066"
                  strokeWidth={2}
                  dot={false}
                  name="Alerts"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
