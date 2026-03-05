package models

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type FleetVehicle struct {
	ID          string    `json:"id"`
	WarehouseID string    `json:"warehouse_id"`
	Type        string    `json:"type"`
	Identifier  string    `json:"identifier"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type VehicleTrajectory struct {
	ID             string          `json:"id"`
	VehicleID      string          `json:"vehicle_id"`
	CameraID       *string         `json:"camera_id,omitempty"`
	Path           json.RawMessage `json:"path"`
	SpeedAvg       *float64        `json:"speed_avg,omitempty"`
	SpeedMax       *float64        `json:"speed_max,omitempty"`
	ZoneViolations json.RawMessage `json:"zone_violations,omitempty"`
	RecordedAt     time.Time       `json:"recorded_at"`
}

func ListFleetVehicles(ctx context.Context, pool *pgxpool.Pool, warehouseID string) ([]FleetVehicle, error) {
	rows, err := pool.Query(ctx,
		`SELECT id, warehouse_id, type, identifier, status, created_at
		 FROM fleet_vehicles WHERE warehouse_id = $1 ORDER BY identifier`, warehouseID)
	if err != nil {
		return nil, fmt.Errorf("list fleet vehicles: %w", err)
	}
	defer rows.Close()

	var vehicles []FleetVehicle
	for rows.Next() {
		var v FleetVehicle
		if err := rows.Scan(&v.ID, &v.WarehouseID, &v.Type, &v.Identifier, &v.Status, &v.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan vehicle: %w", err)
		}
		vehicles = append(vehicles, v)
	}
	return vehicles, nil
}

func GetVehicleTrajectory(ctx context.Context, pool *pgxpool.Pool, vehicleID string) ([]VehicleTrajectory, error) {
	rows, err := pool.Query(ctx,
		`SELECT id, vehicle_id, camera_id, path, speed_avg, speed_max, zone_violations, recorded_at
		 FROM vehicle_trajectories WHERE vehicle_id = $1 ORDER BY recorded_at DESC LIMIT 100`, vehicleID)
	if err != nil {
		return nil, fmt.Errorf("get trajectories: %w", err)
	}
	defer rows.Close()

	var trajectories []VehicleTrajectory
	for rows.Next() {
		var t VehicleTrajectory
		if err := rows.Scan(&t.ID, &t.VehicleID, &t.CameraID, &t.Path, &t.SpeedAvg, &t.SpeedMax, &t.ZoneViolations, &t.RecordedAt); err != nil {
			return nil, fmt.Errorf("scan trajectory: %w", err)
		}
		trajectories = append(trajectories, t)
	}
	return trajectories, nil
}

func CreateTrajectory(ctx context.Context, pool *pgxpool.Pool, t *VehicleTrajectory) error {
	return pool.QueryRow(ctx,
		`INSERT INTO vehicle_trajectories (vehicle_id, camera_id, path, speed_avg, speed_max, zone_violations)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, recorded_at`,
		t.VehicleID, t.CameraID, t.Path, t.SpeedAvg, t.SpeedMax, t.ZoneViolations).
		Scan(&t.ID, &t.RecordedAt)
}
