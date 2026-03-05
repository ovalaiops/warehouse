package models

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Alert struct {
	ID             string          `json:"id"`
	WarehouseID    string          `json:"warehouse_id"`
	CameraID       *string         `json:"camera_id,omitempty"`
	ZoneID         *string         `json:"zone_id,omitempty"`
	Type           string          `json:"type"`
	Subtype        string          `json:"subtype"`
	Severity       string          `json:"severity"`
	Status         string          `json:"status"`
	Title          string          `json:"title"`
	Description    *string         `json:"description,omitempty"`
	Reasoning      *string         `json:"reasoning,omitempty"`
	Detections     json.RawMessage `json:"detections,omitempty"`
	VideoClipURL   *string         `json:"video_clip_url,omitempty"`
	ThumbnailURL   *string         `json:"thumbnail_url,omitempty"`
	Metadata       json.RawMessage `json:"metadata,omitempty"`
	DetectedAt     time.Time       `json:"detected_at"`
	AcknowledgedAt *time.Time      `json:"acknowledged_at,omitempty"`
	ResolvedAt     *time.Time      `json:"resolved_at,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
}

type AlertFilter struct {
	WarehouseID string
	Type        string
	Severity    string
	Status      string
	Limit       int
	Offset      int
}

type AlertStats struct {
	TotalCount    int            `json:"total_count"`
	BySeverity    map[string]int `json:"by_severity"`
	ByType        map[string]int `json:"by_type"`
	ByStatus      map[string]int `json:"by_status"`
}

func ListAlerts(ctx context.Context, pool *pgxpool.Pool, f AlertFilter) ([]Alert, int, error) {
	conditions := []string{"1=1"}
	args := []interface{}{}
	argIdx := 1

	if f.WarehouseID != "" {
		conditions = append(conditions, fmt.Sprintf("warehouse_id = $%d", argIdx))
		args = append(args, f.WarehouseID)
		argIdx++
	}
	if f.Type != "" {
		conditions = append(conditions, fmt.Sprintf("type = $%d", argIdx))
		args = append(args, f.Type)
		argIdx++
	}
	if f.Severity != "" {
		conditions = append(conditions, fmt.Sprintf("severity = $%d", argIdx))
		args = append(args, f.Severity)
		argIdx++
	}
	if f.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, f.Status)
		argIdx++
	}

	where := strings.Join(conditions, " AND ")

	// Count
	var total int
	err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM alerts WHERE "+where, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count alerts: %w", err)
	}

	if f.Limit <= 0 {
		f.Limit = 50
	}
	query := fmt.Sprintf(
		`SELECT id, warehouse_id, camera_id, zone_id, type, subtype, severity, status,
		        title, description, reasoning, detections, video_clip_url, thumbnail_url,
		        metadata, detected_at, acknowledged_at, resolved_at, created_at
		 FROM alerts WHERE %s ORDER BY detected_at DESC LIMIT $%d OFFSET $%d`,
		where, argIdx, argIdx+1)
	args = append(args, f.Limit, f.Offset)

	rows, err := pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list alerts: %w", err)
	}
	defer rows.Close()

	var alerts []Alert
	for rows.Next() {
		var a Alert
		if err := rows.Scan(
			&a.ID, &a.WarehouseID, &a.CameraID, &a.ZoneID,
			&a.Type, &a.Subtype, &a.Severity, &a.Status,
			&a.Title, &a.Description, &a.Reasoning, &a.Detections,
			&a.VideoClipURL, &a.ThumbnailURL, &a.Metadata,
			&a.DetectedAt, &a.AcknowledgedAt, &a.ResolvedAt, &a.CreatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan alert: %w", err)
		}
		alerts = append(alerts, a)
	}
	return alerts, total, nil
}

func GetAlertByID(ctx context.Context, pool *pgxpool.Pool, id string) (*Alert, error) {
	var a Alert
	err := pool.QueryRow(ctx,
		`SELECT id, warehouse_id, camera_id, zone_id, type, subtype, severity, status,
		        title, description, reasoning, detections, video_clip_url, thumbnail_url,
		        metadata, detected_at, acknowledged_at, resolved_at, created_at
		 FROM alerts WHERE id = $1`, id).
		Scan(&a.ID, &a.WarehouseID, &a.CameraID, &a.ZoneID,
			&a.Type, &a.Subtype, &a.Severity, &a.Status,
			&a.Title, &a.Description, &a.Reasoning, &a.Detections,
			&a.VideoClipURL, &a.ThumbnailURL, &a.Metadata,
			&a.DetectedAt, &a.AcknowledgedAt, &a.ResolvedAt, &a.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get alert: %w", err)
	}
	return &a, nil
}

func CreateAlert(ctx context.Context, pool *pgxpool.Pool, a *Alert) error {
	if a.Metadata == nil {
		a.Metadata = json.RawMessage(`{}`)
	}
	return pool.QueryRow(ctx,
		`INSERT INTO alerts (warehouse_id, camera_id, zone_id, type, subtype, severity, status,
		 title, description, reasoning, detections, video_clip_url, thumbnail_url, metadata, detected_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
		 RETURNING id, created_at`,
		a.WarehouseID, a.CameraID, a.ZoneID, a.Type, a.Subtype, a.Severity, a.Status,
		a.Title, a.Description, a.Reasoning, a.Detections,
		a.VideoClipURL, a.ThumbnailURL, a.Metadata, a.DetectedAt).
		Scan(&a.ID, &a.CreatedAt)
}

func UpdateAlertStatus(ctx context.Context, pool *pgxpool.Pool, id, status string) error {
	var extra string
	switch status {
	case "acknowledged":
		extra = ", acknowledged_at = NOW()"
	case "resolved":
		extra = ", resolved_at = NOW()"
	}
	query := fmt.Sprintf("UPDATE alerts SET status = $1%s WHERE id = $2", extra)
	tag, err := pool.Exec(ctx, query, status, id)
	if err != nil {
		return fmt.Errorf("update alert status: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("alert not found")
	}
	return nil
}

func GetAlertStats(ctx context.Context, pool *pgxpool.Pool, warehouseID string) (*AlertStats, error) {
	stats := &AlertStats{
		BySeverity: make(map[string]int),
		ByType:     make(map[string]int),
		ByStatus:   make(map[string]int),
	}

	err := pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM alerts WHERE warehouse_id = $1`, warehouseID).
		Scan(&stats.TotalCount)
	if err != nil {
		return nil, fmt.Errorf("count alerts: %w", err)
	}

	// By severity
	rows, err := pool.Query(ctx,
		`SELECT severity, COUNT(*) FROM alerts WHERE warehouse_id = $1 GROUP BY severity`, warehouseID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var k string
		var v int
		rows.Scan(&k, &v)
		stats.BySeverity[k] = v
	}
	rows.Close()

	// By type
	rows, err = pool.Query(ctx,
		`SELECT type, COUNT(*) FROM alerts WHERE warehouse_id = $1 GROUP BY type`, warehouseID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var k string
		var v int
		rows.Scan(&k, &v)
		stats.ByType[k] = v
	}
	rows.Close()

	// By status
	rows, err = pool.Query(ctx,
		`SELECT status, COUNT(*) FROM alerts WHERE warehouse_id = $1 GROUP BY status`, warehouseID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var k string
		var v int
		rows.Scan(&k, &v)
		stats.ByStatus[k] = v
	}
	rows.Close()

	return stats, nil
}
