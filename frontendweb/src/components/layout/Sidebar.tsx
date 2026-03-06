import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import {
  LayoutDashboard,
  AlertTriangle,
  Camera,
  Map,
  Package,
  Truck,
  BarChart3,
  FileText,
  Brain,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/alerts", label: "Alerts", icon: AlertTriangle },
  { path: "/cameras", label: "Cameras", icon: Camera },
  { path: "/warehouse", label: "Warehouse Map", icon: Map },
  { path: "/inventory", label: "Inventory", icon: Package },
  { path: "/fleet", label: "Fleet", icon: Truck },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/reports", label: "Reports", icon: FileText },
  { path: "/cosmos", label: "Cosmos AI", icon: Brain },
  { path: "/admin", label: "Admin", icon: Shield },
  { path: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-surface border-r border-border flex flex-col z-40 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border flex-shrink-0">
        <div className="w-8 h-8 rounded-button bg-accent/10 flex items-center justify-center flex-shrink-0">
          <div className="w-3 h-3 rounded-full bg-accent shadow-[0_0_10px_rgba(0,255,178,0.5)]" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-text-primary tracking-tight whitespace-nowrap font-display">
            WareHouse <span className="text-accent">AI</span>
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li
              key={item.path}
              onMouseEnter={() => setHoveredItem(item.path)}
              onMouseLeave={() => setHoveredItem(null)}
              className="relative"
            >
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-button transition-all duration-200 group relative",
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r" />
                    )}
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && (
                      <span className="text-sm font-medium">{item.label}</span>
                    )}
                  </>
                )}
              </NavLink>
              {collapsed && hoveredItem === item.path && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-surface-elevated text-text-primary text-xs font-medium rounded-badge whitespace-nowrap border border-border shadow-lg z-50">
                  {item.label}
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-3 space-y-2">
        {/* User */}
        <div
          className={cn(
            "flex items-center gap-3",
            collapsed ? "justify-center" : "px-2"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-accent">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.name || "Operator"}
              </p>
              <p className="text-xs text-text-muted truncate">
                {user?.role || "admin"}
              </p>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-button text-text-muted hover:text-critical hover:bg-critical/10 transition-colors",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-button text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
