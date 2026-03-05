-- Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    org_id UUID REFERENCES organizations(id),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Warehouses
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    address TEXT,
    dimensions JSONB,
    floor_plan_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Zones
CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    bounds JSONB NOT NULL,
    rules JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cameras
CREATE TABLE cameras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES zones(id),
    name TEXT NOT NULL,
    feed_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    camera_id UUID REFERENCES cameras(id),
    zone_id UUID REFERENCES zones(id),
    type TEXT NOT NULL,
    subtype TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    title TEXT NOT NULL,
    description TEXT,
    reasoning TEXT,
    detections JSONB,
    video_clip_url TEXT,
    thumbnail_url TEXT,
    metadata JSONB DEFAULT '{}',
    detected_at TIMESTAMPTZ NOT NULL,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_warehouse_status ON alerts(warehouse_id, status);
CREATE INDEX idx_alerts_type_severity ON alerts(type, severity);
CREATE INDEX idx_alerts_detected_at ON alerts(detected_at DESC);

-- Rack Positions
CREATE TABLE rack_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    zone_id UUID REFERENCES zones(id),
    aisle TEXT NOT NULL,
    bay TEXT NOT NULL,
    level TEXT NOT NULL,
    position_code TEXT NOT NULL,
    coordinates JSONB,
    max_weight_lbs NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(warehouse_id, position_code)
);

-- Inventory Snapshots
CREATE TABLE inventory_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rack_position_id UUID NOT NULL REFERENCES rack_positions(id),
    camera_id UUID REFERENCES cameras(id),
    status TEXT NOT NULL,
    detected_items JSONB,
    expected_items JSONB,
    confidence NUMERIC,
    snapshot_url TEXT,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fleet Vehicles
CREATE TABLE fleet_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    type TEXT NOT NULL,
    identifier TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'idle',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vehicle Trajectories
CREATE TABLE vehicle_trajectories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id),
    camera_id UUID REFERENCES cameras(id),
    path JSONB NOT NULL,
    speed_avg NUMERIC,
    speed_max NUMERIC,
    zone_violations JSONB,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shift Reports
CREATE TABLE shift_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    shift_start TIMESTAMPTZ NOT NULL,
    shift_end TIMESTAMPTZ NOT NULL,
    summary TEXT,
    metrics JSONB,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products (Consumer)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upc TEXT UNIQUE,
    ean TEXT UNIQUE,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    description TEXT,
    image_url TEXT,
    ingredients JSONB,
    nutrition JSONB,
    allergens TEXT[],
    certifications TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product Prices
CREATE TABLE product_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    retailer TEXT NOT NULL,
    price NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    unit_price NUMERIC,
    unit TEXT,
    source_url TEXT,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product Scans
CREATE TABLE product_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    product_id UUID REFERENCES products(id),
    scan_image_url TEXT,
    raw_inference JSONB,
    confidence NUMERIC,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shopping Lists
CREATE TABLE shopping_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name TEXT NOT NULL DEFAULT 'My List',
    items JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
