import React, { useState } from "react";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { useAuthStore } from "@/store/authStore";
import {
  User,
  Building2,
  Bell,
  Shield,
  Save,
} from "lucide-react";

const Settings: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("profile");

  const [profileName, setProfileName] = useState(user?.name || "Alex Martinez");
  const [profileEmail, setProfileEmail] = useState(user?.email || "admin@warehouse.ai");

  const [warehouseName, setWarehouseName] = useState("Austin Distribution Center");
  const [warehouseAddress, setWarehouseAddress] = useState("1234 Industrial Blvd, Austin, TX 78701");

  const [safetyThreshold, setSafetyThreshold] = useState(90);
  const [nearMissDistance, setNearMissDistance] = useState(2.0);
  const [congestionLimit, setCongestionLimit] = useState(3);
  const [speedLimit, setSpeedLimit] = useState(10);

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [dailyDigest, setDailyDigest] = useState(true);

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "warehouse", label: "Warehouse", icon: Building2 },
    { id: "alerts", label: "Alert Thresholds", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary font-display">Settings</h1>
        <p className="text-sm text-text-muted mt-1">
          Manage your account and platform configuration
        </p>
      </div>

      <div className="flex gap-6">
        {/* Tab navigation */}
        <div className="w-56 flex-shrink-0">
          <Card padding="sm">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-button text-sm transition-colors ${
                    activeTab === tab.id
                      ? "bg-accent/10 text-accent"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === "profile" && (
            <Card header={{ title: "Profile Settings" }} padding="lg">
              <div className="space-y-5 max-w-lg">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-2xl font-bold text-accent">
                      {profileName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-text-primary">{profileName}</p>
                    <p className="text-sm text-text-muted capitalize">{user?.role || "admin"}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-button px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/40"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-button px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/40"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Role
                  </label>
                  <input
                    type="text"
                    value={user?.role || "admin"}
                    disabled
                    className="w-full bg-background border border-border rounded-button px-4 py-2.5 text-sm text-text-muted cursor-not-allowed"
                  />
                </div>

                <Button variant="primary" size="md">
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </div>
            </Card>
          )}

          {activeTab === "warehouse" && (
            <Card header={{ title: "Warehouse Settings" }} padding="lg">
              <div className="space-y-5 max-w-lg">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Warehouse Name
                  </label>
                  <input
                    type="text"
                    value={warehouseName}
                    onChange={(e) => setWarehouseName(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-button px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/40"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Address
                  </label>
                  <input
                    type="text"
                    value={warehouseAddress}
                    onChange={(e) => setWarehouseAddress(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-button px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Width (m)
                    </label>
                    <input
                      type="number"
                      defaultValue={120}
                      className="w-full bg-surface-elevated border border-border rounded-button px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Height (m)
                    </label>
                    <input
                      type="number"
                      defaultValue={80}
                      className="w-full bg-surface-elevated border border-border rounded-button px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/40"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Timezone
                  </label>
                  <select className="w-full bg-surface-elevated border border-border rounded-button px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/40">
                    <option>America/Chicago (CST)</option>
                    <option>America/New_York (EST)</option>
                    <option>America/Los_Angeles (PST)</option>
                    <option>America/Denver (MST)</option>
                  </select>
                </div>

                <Button variant="primary" size="md">
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </div>
            </Card>
          )}

          {activeTab === "alerts" && (
            <Card header={{ title: "Alert Threshold Configuration" }} padding="lg">
              <div className="space-y-6 max-w-lg">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-text-primary">
                      Safety Score Threshold
                    </label>
                    <span className="text-sm font-mono text-accent">{safetyThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="70"
                    max="100"
                    value={safetyThreshold}
                    onChange={(e) => setSafetyThreshold(Number(e.target.value))}
                    className="w-full accent-accent"
                  />
                  <p className="text-xs text-text-muted">
                    Alert when safety score drops below this threshold
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-text-primary">
                      Near-Miss Distance (meters)
                    </label>
                    <span className="text-sm font-mono text-accent">{nearMissDistance.toFixed(1)}m</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.1"
                    value={nearMissDistance}
                    onChange={(e) => setNearMissDistance(Number(e.target.value))}
                    className="w-full accent-accent"
                  />
                  <p className="text-xs text-text-muted">
                    Minimum safe distance between vehicles and pedestrians
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-text-primary">
                      Zone Congestion Limit (vehicles)
                    </label>
                    <span className="text-sm font-mono text-accent">{congestionLimit}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={congestionLimit}
                    onChange={(e) => setCongestionLimit(Number(e.target.value))}
                    className="w-full accent-accent"
                  />
                  <p className="text-xs text-text-muted">
                    Maximum vehicles allowed per zone before congestion alert
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-text-primary">
                      Vehicle Speed Limit (km/h)
                    </label>
                    <span className="text-sm font-mono text-accent">{speedLimit} km/h</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="20"
                    value={speedLimit}
                    onChange={(e) => setSpeedLimit(Number(e.target.value))}
                    className="w-full accent-accent"
                  />
                  <p className="text-xs text-text-muted">
                    Maximum allowed speed for vehicles in warehouse zones
                  </p>
                </div>

                <Button variant="primary" size="md">
                  <Save className="w-4 h-4" />
                  Save Thresholds
                </Button>
              </div>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card header={{ title: "Notification Preferences" }} padding="lg">
              <div className="space-y-5 max-w-lg">
                <ToggleRow
                  label="Email Alerts"
                  description="Receive alert notifications via email"
                  checked={emailAlerts}
                  onChange={setEmailAlerts}
                />
                <ToggleRow
                  label="Push Notifications"
                  description="Browser push notifications for real-time alerts"
                  checked={pushAlerts}
                  onChange={setPushAlerts}
                />
                <ToggleRow
                  label="Critical Alerts Only"
                  description="Only notify for critical severity alerts"
                  checked={criticalOnly}
                  onChange={setCriticalOnly}
                />
                <ToggleRow
                  label="Daily Digest"
                  description="Receive a daily summary email at end of shift"
                  checked={dailyDigest}
                  onChange={setDailyDigest}
                />

                <Button variant="primary" size="md">
                  <Save className="w-4 h-4" />
                  Save Preferences
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

const ToggleRow: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
    <div>
      <p className="text-sm font-medium text-text-primary">{label}</p>
      <p className="text-xs text-text-muted mt-0.5">{description}</p>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? "bg-accent" : "bg-surface-elevated border border-border"
      }`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded-full transition-transform ${
          checked
            ? "translate-x-[22px] bg-background"
            : "translate-x-0.5 bg-text-muted"
        }`}
      />
    </button>
  </div>
);

export default Settings;
