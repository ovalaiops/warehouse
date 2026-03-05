import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useAlertStore } from "@/store/alertStore";
import { useWarehouseStore } from "@/store/warehouseStore";
import { useAuthStore } from "@/store/authStore";
import {
  Bell,
  Search,
  ChevronDown,
  Building2,
} from "lucide-react";
import type { Warehouse } from "@/types";

const mockWarehouses: Warehouse[] = [
  { id: "wh-1", orgId: "org-1", name: "Austin Distribution Center", createdAt: "2024-01-01" },
  { id: "wh-2", orgId: "org-1", name: "Dallas Fulfillment Hub", createdAt: "2024-01-01" },
  { id: "wh-3", orgId: "org-1", name: "Houston Cold Storage", createdAt: "2024-01-01" },
];

export const Header: React.FC = () => {
  const { unreadCount } = useAlertStore();
  const { selectedWarehouse, setSelectedWarehouse } = useWarehouseStore();
  const { user } = useAuthStore();
  const [showWarehouseMenu, setShowWarehouseMenu] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const currentWarehouse = selectedWarehouse || mockWarehouses[0];

  const handleSelectWarehouse = (wh: Warehouse) => {
    setSelectedWarehouse(wh);
    setShowWarehouseMenu(false);
  };

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Warehouse Selector */}
      <div className="relative">
        <button
          onClick={() => setShowWarehouseMenu(!showWarehouseMenu)}
          className="flex items-center gap-2 px-3 py-2 rounded-button bg-surface-elevated border border-border hover:border-accent/30 transition-colors"
        >
          <Building2 className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-text-primary">
            {currentWarehouse.name}
          </span>
          <ChevronDown className="w-4 h-4 text-text-muted" />
        </button>

        {showWarehouseMenu && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-surface-elevated border border-border rounded-card shadow-xl z-50">
            {mockWarehouses.map((wh) => (
              <button
                key={wh.id}
                onClick={() => handleSelectWarehouse(wh)}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-surface transition-colors first:rounded-t-card last:rounded-b-card",
                  currentWarehouse.id === wh.id
                    ? "text-accent bg-accent/5"
                    : "text-text-secondary"
                )}
              >
                <Building2 className="w-4 h-4" />
                {wh.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search alerts, cameras, zones..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-elevated border border-border rounded-button text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 transition-colors"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <button className="relative p-2 rounded-button text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold bg-accent text-background rounded-full">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-xs font-bold text-accent">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
