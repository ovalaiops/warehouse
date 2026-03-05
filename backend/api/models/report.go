package models

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ShiftReport struct {
	ID          string          `json:"id"`
	WarehouseID string          `json:"warehouse_id"`
	ShiftStart  time.Time       `json:"shift_start"`
	ShiftEnd    time.Time       `json:"shift_end"`
	Summary     *string         `json:"summary,omitempty"`
	Metrics     json.RawMessage `json:"metrics,omitempty"`
	GeneratedAt time.Time       `json:"generated_at"`
}

func ListReports(ctx context.Context, pool *pgxpool.Pool, warehouseID string, limit, offset int) ([]ShiftReport, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := pool.Query(ctx,
		`SELECT id, warehouse_id, shift_start, shift_end, summary, metrics, generated_at
		 FROM shift_reports WHERE warehouse_id = $1 ORDER BY generated_at DESC LIMIT $2 OFFSET $3`,
		warehouseID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list reports: %w", err)
	}
	defer rows.Close()

	var reports []ShiftReport
	for rows.Next() {
		var r ShiftReport
		if err := rows.Scan(&r.ID, &r.WarehouseID, &r.ShiftStart, &r.ShiftEnd, &r.Summary, &r.Metrics, &r.GeneratedAt); err != nil {
			return nil, fmt.Errorf("scan report: %w", err)
		}
		reports = append(reports, r)
	}
	return reports, nil
}

func GetReportByID(ctx context.Context, pool *pgxpool.Pool, id string) (*ShiftReport, error) {
	var r ShiftReport
	err := pool.QueryRow(ctx,
		`SELECT id, warehouse_id, shift_start, shift_end, summary, metrics, generated_at
		 FROM shift_reports WHERE id = $1`, id).
		Scan(&r.ID, &r.WarehouseID, &r.ShiftStart, &r.ShiftEnd, &r.Summary, &r.Metrics, &r.GeneratedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get report: %w", err)
	}
	return &r, nil
}

func CreateReport(ctx context.Context, pool *pgxpool.Pool, r *ShiftReport) error {
	return pool.QueryRow(ctx,
		`INSERT INTO shift_reports (warehouse_id, shift_start, shift_end, summary, metrics)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, generated_at`,
		r.WarehouseID, r.ShiftStart, r.ShiftEnd, r.Summary, r.Metrics).
		Scan(&r.ID, &r.GeneratedAt)
}
