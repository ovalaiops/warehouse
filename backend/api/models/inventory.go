package models

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type RackPosition struct {
	ID            string          `json:"id"`
	WarehouseID   string          `json:"warehouse_id"`
	ZoneID        *string         `json:"zone_id,omitempty"`
	Aisle         string          `json:"aisle"`
	Bay           string          `json:"bay"`
	Level         string          `json:"level"`
	PositionCode  string          `json:"position_code"`
	Coordinates   json.RawMessage `json:"coordinates,omitempty"`
	MaxWeightLbs  *float64        `json:"max_weight_lbs,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
}

type InventorySnapshot struct {
	ID             string          `json:"id"`
	RackPositionID string          `json:"rack_position_id"`
	CameraID       *string         `json:"camera_id,omitempty"`
	Status         string          `json:"status"`
	DetectedItems  json.RawMessage `json:"detected_items,omitempty"`
	ExpectedItems  json.RawMessage `json:"expected_items,omitempty"`
	Confidence     *float64        `json:"confidence,omitempty"`
	SnapshotURL    *string         `json:"snapshot_url,omitempty"`
	ScannedAt      time.Time       `json:"scanned_at"`
}

func ListRackPositions(ctx context.Context, pool *pgxpool.Pool, warehouseID string) ([]RackPosition, error) {
	rows, err := pool.Query(ctx,
		`SELECT id, warehouse_id, zone_id, aisle, bay, level, position_code, coordinates, max_weight_lbs, created_at
		 FROM rack_positions WHERE warehouse_id = $1 ORDER BY position_code`, warehouseID)
	if err != nil {
		return nil, fmt.Errorf("list rack positions: %w", err)
	}
	defer rows.Close()

	var positions []RackPosition
	for rows.Next() {
		var rp RackPosition
		if err := rows.Scan(&rp.ID, &rp.WarehouseID, &rp.ZoneID, &rp.Aisle, &rp.Bay, &rp.Level,
			&rp.PositionCode, &rp.Coordinates, &rp.MaxWeightLbs, &rp.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan rack position: %w", err)
		}
		positions = append(positions, rp)
	}
	return positions, nil
}

func GetInventoryAnomalies(ctx context.Context, pool *pgxpool.Pool, warehouseID string) ([]InventorySnapshot, error) {
	rows, err := pool.Query(ctx,
		`SELECT s.id, s.rack_position_id, s.camera_id, s.status, s.detected_items, s.expected_items, s.confidence, s.snapshot_url, s.scanned_at
		 FROM inventory_snapshots s
		 JOIN rack_positions rp ON rp.id = s.rack_position_id
		 WHERE rp.warehouse_id = $1 AND s.status IN ('mismatch', 'empty', 'anomaly')
		 ORDER BY s.scanned_at DESC LIMIT 100`, warehouseID)
	if err != nil {
		return nil, fmt.Errorf("get inventory anomalies: %w", err)
	}
	defer rows.Close()

	var snapshots []InventorySnapshot
	for rows.Next() {
		var s InventorySnapshot
		if err := rows.Scan(&s.ID, &s.RackPositionID, &s.CameraID, &s.Status, &s.DetectedItems,
			&s.ExpectedItems, &s.Confidence, &s.SnapshotURL, &s.ScannedAt); err != nil {
			return nil, fmt.Errorf("scan snapshot: %w", err)
		}
		snapshots = append(snapshots, s)
	}
	return snapshots, nil
}

func CreateInventorySnapshot(ctx context.Context, pool *pgxpool.Pool, s *InventorySnapshot) error {
	return pool.QueryRow(ctx,
		`INSERT INTO inventory_snapshots (rack_position_id, camera_id, status, detected_items, expected_items, confidence, snapshot_url)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, scanned_at`,
		s.RackPositionID, s.CameraID, s.Status, s.DetectedItems, s.ExpectedItems, s.Confidence, s.SnapshotURL).
		Scan(&s.ID, &s.ScannedAt)
}
