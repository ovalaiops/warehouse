// Shared TypeScript types for the Warehouse Intelligence Platform

// --- Auth ---
export interface User {
  id: string;
  firebaseUid: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "viewer" | "consumer";
  orgId?: string;
  preferences: Record<string, unknown>;
  createdAt: string;
}

// --- Warehouse ---
export interface Organization {
  id: string;
  name: string;
  plan: "free" | "pro" | "enterprise";
  createdAt: string;
}

export interface Warehouse {
  id: string;
  orgId: string;
  name: string;
  address?: string;
  dimensions?: { width: number; height: number; unit: string };
  floorPlanUrl?: string;
  createdAt: string;
}

export interface Zone {
  id: string;
  warehouseId: string;
  name: string;
  type: "receiving" | "storage" | "picking" | "shipping" | "dock" | "restricted";
  bounds: number[][]; // polygon coordinates
  rules: Record<string, unknown>;
  createdAt: string;
}

export interface Camera {
  id: string;
  warehouseId: string;
  zoneId?: string;
  name: string;
  feedUrl?: string;
  status: "active" | "inactive" | "error";
  config: Record<string, unknown>;
  createdAt: string;
}

// --- Alerts ---
export type AlertType = "safety" | "inventory" | "congestion" | "security" | "quality";
export type AlertSeverity = "critical" | "warning" | "info";
export type AlertStatus = "new" | "acknowledged" | "resolved" | "dismissed";

export interface Detection {
  label: string;
  bbox?: [number, number, number, number]; // [x1, y1, x2, y2]
  confidence?: number;
  timestamp?: string; // mm:ss
  trajectory?: Array<{ point2d: [number, number]; label: string }>;
  metadata?: Record<string, unknown>;
}

export interface Alert {
  id: string;
  warehouseId: string;
  cameraId?: string;
  zoneId?: string;
  type: AlertType;
  subtype: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description?: string;
  reasoning?: string;
  detections?: Detection[];
  videoClipUrl?: string;
  thumbnailUrl?: string;
  metadata: Record<string, unknown>;
  detectedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  createdAt: string;
}

// --- Inventory ---
export interface RackPosition {
  id: string;
  warehouseId: string;
  zoneId?: string;
  aisle: string;
  bay: string;
  level: string;
  positionCode: string;
  coordinates?: { x: number; y: number };
  maxWeightLbs?: number;
}

export interface InventorySnapshot {
  id: string;
  rackPositionId: string;
  cameraId?: string;
  status: "occupied" | "empty" | "anomaly";
  detectedItems?: Record<string, unknown>;
  expectedItems?: Record<string, unknown>;
  confidence?: number;
  snapshotUrl?: string;
  scannedAt: string;
}

// --- Fleet ---
export interface FleetVehicle {
  id: string;
  warehouseId: string;
  type: "forklift" | "pallet_jack" | "agv";
  identifier: string;
  status: "active" | "idle" | "charging" | "maintenance";
  createdAt: string;
}

export interface VehicleTrajectory {
  id: string;
  vehicleId: string;
  cameraId?: string;
  path: Array<{ x: number; y: number; timestamp: string }>;
  speedAvg?: number;
  speedMax?: number;
  zoneViolations?: Record<string, unknown>[];
  recordedAt: string;
}

// --- Reports ---
export interface ShiftReport {
  id: string;
  warehouseId: string;
  shiftStart: string;
  shiftEnd: string;
  summary?: string;
  metrics?: {
    alertCount: number;
    safetyEvents: number;
    inventoryAnomalies: number;
    operationalTempo: "high" | "medium" | "low";
  };
  generatedAt: string;
}

// --- Consumer / Products ---
export interface Product {
  id: string;
  upc?: string;
  ean?: string;
  name: string;
  brand?: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  ingredients?: string[];
  nutrition?: Record<string, number | string>;
  allergens?: string[];
  certifications?: string[];
  metadata: Record<string, unknown>;
}

export interface ProductPrice {
  id: string;
  productId: string;
  retailer: string;
  price: number;
  currency: string;
  unitPrice?: number;
  unit?: string;
  fetchedAt: string;
}

export interface ProductScan {
  id: string;
  userId: string;
  productId?: string;
  scanImageUrl?: string;
  rawInference?: Record<string, unknown>;
  confidence?: number;
  scannedAt: string;
}

export interface ShoppingList {
  id: string;
  userId: string;
  name: string;
  items: Array<{ productId: string; quantity: number; checked: boolean }>;
  createdAt: string;
  updatedAt: string;
}

// --- WebSocket Events ---
export type WSEventType = "alert.created" | "alert.updated" | "fleet.position" | "fleet.near_miss";

export interface WSEvent<T = unknown> {
  eventType: WSEventType;
  payload: T;
  timestamp: string;
}

// --- API Response ---
export interface ApiResponse<T> {
  data: T;
  meta?: { total: number; limit: number; offset: number };
}

export interface ApiError {
  error: string;
  message: string;
  code: number;
}
