package models

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Warehouse struct {
	ID           string          `json:"id"`
	OrgID        string          `json:"org_id"`
	Name         string          `json:"name"`
	Address      *string         `json:"address,omitempty"`
	Dimensions   json.RawMessage `json:"dimensions,omitempty"`
	FloorPlanURL *string         `json:"floor_plan_url,omitempty"`
	CreatedAt    time.Time       `json:"created_at"`
}

type Zone struct {
	ID          string          `json:"id"`
	WarehouseID string          `json:"warehouse_id"`
	Name        string          `json:"name"`
	Type        string          `json:"type"`
	Bounds      json.RawMessage `json:"bounds"`
	Rules       json.RawMessage `json:"rules,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
}

type Camera struct {
	ID          string          `json:"id"`
	WarehouseID string          `json:"warehouse_id"`
	ZoneID      *string         `json:"zone_id,omitempty"`
	Name        string          `json:"name"`
	FeedURL     *string         `json:"feed_url,omitempty"`
	Status      string          `json:"status"`
	Config      json.RawMessage `json:"config,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
}

// Warehouse CRUD

func ListWarehousesByOrg(ctx context.Context, pool *pgxpool.Pool, orgID string) ([]Warehouse, error) {
	rows, err := pool.Query(ctx,
		`SELECT id, org_id, name, address, dimensions, floor_plan_url, created_at
		 FROM warehouses WHERE org_id = $1 ORDER BY created_at DESC`, orgID)
	if err != nil {
		return nil, fmt.Errorf("list warehouses: %w", err)
	}
	defer rows.Close()

	var warehouses []Warehouse
	for rows.Next() {
		var w Warehouse
		if err := rows.Scan(&w.ID, &w.OrgID, &w.Name, &w.Address, &w.Dimensions, &w.FloorPlanURL, &w.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan warehouse: %w", err)
		}
		warehouses = append(warehouses, w)
	}
	return warehouses, nil
}

func GetWarehouseByID(ctx context.Context, pool *pgxpool.Pool, id string) (*Warehouse, error) {
	var w Warehouse
	err := pool.QueryRow(ctx,
		`SELECT id, org_id, name, address, dimensions, floor_plan_url, created_at
		 FROM warehouses WHERE id = $1`, id).
		Scan(&w.ID, &w.OrgID, &w.Name, &w.Address, &w.Dimensions, &w.FloorPlanURL, &w.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get warehouse: %w", err)
	}
	return &w, nil
}

func CreateWarehouse(ctx context.Context, pool *pgxpool.Pool, w *Warehouse) error {
	return pool.QueryRow(ctx,
		`INSERT INTO warehouses (org_id, name, address, dimensions, floor_plan_url)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, created_at`,
		w.OrgID, w.Name, w.Address, w.Dimensions, w.FloorPlanURL).
		Scan(&w.ID, &w.CreatedAt)
}

func UpdateWarehouse(ctx context.Context, pool *pgxpool.Pool, w *Warehouse) error {
	_, err := pool.Exec(ctx,
		`UPDATE warehouses SET name = $1, address = $2, dimensions = $3, floor_plan_url = $4 WHERE id = $5`,
		w.Name, w.Address, w.Dimensions, w.FloorPlanURL, w.ID)
	return err
}

func DeleteWarehouse(ctx context.Context, pool *pgxpool.Pool, id string) error {
	_, err := pool.Exec(ctx, `DELETE FROM warehouses WHERE id = $1`, id)
	return err
}

// Zone CRUD

func ListZonesByWarehouse(ctx context.Context, pool *pgxpool.Pool, warehouseID string) ([]Zone, error) {
	rows, err := pool.Query(ctx,
		`SELECT id, warehouse_id, name, type, bounds, rules, created_at
		 FROM zones WHERE warehouse_id = $1 ORDER BY name`, warehouseID)
	if err != nil {
		return nil, fmt.Errorf("list zones: %w", err)
	}
	defer rows.Close()

	var zones []Zone
	for rows.Next() {
		var z Zone
		if err := rows.Scan(&z.ID, &z.WarehouseID, &z.Name, &z.Type, &z.Bounds, &z.Rules, &z.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan zone: %w", err)
		}
		zones = append(zones, z)
	}
	return zones, nil
}

func GetZoneByID(ctx context.Context, pool *pgxpool.Pool, id string) (*Zone, error) {
	var z Zone
	err := pool.QueryRow(ctx,
		`SELECT id, warehouse_id, name, type, bounds, rules, created_at
		 FROM zones WHERE id = $1`, id).
		Scan(&z.ID, &z.WarehouseID, &z.Name, &z.Type, &z.Bounds, &z.Rules, &z.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get zone: %w", err)
	}
	return &z, nil
}

func CreateZone(ctx context.Context, pool *pgxpool.Pool, z *Zone) error {
	return pool.QueryRow(ctx,
		`INSERT INTO zones (warehouse_id, name, type, bounds, rules)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, created_at`,
		z.WarehouseID, z.Name, z.Type, z.Bounds, z.Rules).
		Scan(&z.ID, &z.CreatedAt)
}

func UpdateZone(ctx context.Context, pool *pgxpool.Pool, z *Zone) error {
	_, err := pool.Exec(ctx,
		`UPDATE zones SET name = $1, type = $2, bounds = $3, rules = $4 WHERE id = $5`,
		z.Name, z.Type, z.Bounds, z.Rules, z.ID)
	return err
}

func DeleteZone(ctx context.Context, pool *pgxpool.Pool, id string) error {
	_, err := pool.Exec(ctx, `DELETE FROM zones WHERE id = $1`, id)
	return err
}

// Camera CRUD

func ListCamerasByWarehouse(ctx context.Context, pool *pgxpool.Pool, warehouseID string) ([]Camera, error) {
	rows, err := pool.Query(ctx,
		`SELECT id, warehouse_id, zone_id, name, feed_url, status, config, created_at
		 FROM cameras WHERE warehouse_id = $1 ORDER BY name`, warehouseID)
	if err != nil {
		return nil, fmt.Errorf("list cameras: %w", err)
	}
	defer rows.Close()

	var cameras []Camera
	for rows.Next() {
		var c Camera
		if err := rows.Scan(&c.ID, &c.WarehouseID, &c.ZoneID, &c.Name, &c.FeedURL, &c.Status, &c.Config, &c.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan camera: %w", err)
		}
		cameras = append(cameras, c)
	}
	return cameras, nil
}

func GetCameraByID(ctx context.Context, pool *pgxpool.Pool, id string) (*Camera, error) {
	var c Camera
	err := pool.QueryRow(ctx,
		`SELECT id, warehouse_id, zone_id, name, feed_url, status, config, created_at
		 FROM cameras WHERE id = $1`, id).
		Scan(&c.ID, &c.WarehouseID, &c.ZoneID, &c.Name, &c.FeedURL, &c.Status, &c.Config, &c.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get camera: %w", err)
	}
	return &c, nil
}

func CreateCamera(ctx context.Context, pool *pgxpool.Pool, c *Camera) error {
	if c.Config == nil {
		c.Config = json.RawMessage(`{}`)
	}
	return pool.QueryRow(ctx,
		`INSERT INTO cameras (warehouse_id, zone_id, name, feed_url, status, config)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, created_at`,
		c.WarehouseID, c.ZoneID, c.Name, c.FeedURL, c.Status, c.Config).
		Scan(&c.ID, &c.CreatedAt)
}

func UpdateCamera(ctx context.Context, pool *pgxpool.Pool, c *Camera) error {
	_, err := pool.Exec(ctx,
		`UPDATE cameras SET zone_id = $1, name = $2, feed_url = $3, status = $4, config = $5 WHERE id = $6`,
		c.ZoneID, c.Name, c.FeedURL, c.Status, c.Config, c.ID)
	return err
}

func DeleteCamera(ctx context.Context, pool *pgxpool.Pool, id string) error {
	_, err := pool.Exec(ctx, `DELETE FROM cameras WHERE id = $1`, id)
	return err
}
