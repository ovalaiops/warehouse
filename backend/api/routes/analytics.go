package routes

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/warehouse-intel/api/models"
)

type AnalyticsHandler struct {
	deps *Deps
}

func NewAnalyticsHandler(deps *Deps) *AnalyticsHandler {
	return &AnalyticsHandler{deps: deps}
}

func (h *AnalyticsHandler) Traffic(w http.ResponseWriter, r *http.Request) {
	warehouseID := chi.URLParam(r, "warehouseID")
	days := queryInt(r, "days", 7)

	rows, err := h.deps.DB.Query(r.Context(),
		`SELECT DATE(recorded_at) as day, COUNT(*) as trips
		 FROM vehicle_trajectories vt
		 JOIN fleet_vehicles fv ON fv.id = vt.vehicle_id
		 WHERE fv.warehouse_id = $1 AND vt.recorded_at > NOW() - make_interval(days => $2)
		 GROUP BY DATE(recorded_at)
		 ORDER BY day`, warehouseID, days)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get traffic data")
		return
	}
	defer rows.Close()

	type DayTraffic struct {
		Day   time.Time `json:"day"`
		Trips int       `json:"trips"`
	}
	var data []DayTraffic
	for rows.Next() {
		var d DayTraffic
		if err := rows.Scan(&d.Day, &d.Trips); err != nil {
			continue
		}
		data = append(data, d)
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"warehouse_id": warehouseID,
		"days":         days,
		"data":         data,
	})
}

func (h *AnalyticsHandler) Safety(w http.ResponseWriter, r *http.Request) {
	warehouseID := chi.URLParam(r, "warehouseID")
	days := queryInt(r, "days", 30)

	rows, err := h.deps.DB.Query(r.Context(),
		`SELECT DATE(detected_at) as day, severity, COUNT(*) as count
		 FROM alerts
		 WHERE warehouse_id = $1 AND type = 'safety' AND detected_at > NOW() - make_interval(days => $2)
		 GROUP BY DATE(detected_at), severity
		 ORDER BY day`, warehouseID, days)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get safety data")
		return
	}
	defer rows.Close()

	type SafetyData struct {
		Day      time.Time `json:"day"`
		Severity string    `json:"severity"`
		Count    int       `json:"count"`
	}
	var data []SafetyData
	for rows.Next() {
		var d SafetyData
		if err := rows.Scan(&d.Day, &d.Severity, &d.Count); err != nil {
			continue
		}
		data = append(data, d)
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"warehouse_id": warehouseID,
		"days":         days,
		"data":         data,
	})
}

func (h *AnalyticsHandler) Summary(w http.ResponseWriter, r *http.Request) {
	warehouseID := chi.URLParam(r, "warehouseID")

	alertStats, err := models.GetAlertStats(r.Context(), h.deps.DB, warehouseID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get alert stats")
		return
	}

	var vehicleCount int
	h.deps.DB.QueryRow(r.Context(),
		`SELECT COUNT(*) FROM fleet_vehicles WHERE warehouse_id = $1`, warehouseID).Scan(&vehicleCount)

	var cameraCount int
	h.deps.DB.QueryRow(r.Context(),
		`SELECT COUNT(*) FROM cameras WHERE warehouse_id = $1 AND status = 'active'`, warehouseID).Scan(&cameraCount)

	var zoneCount int
	h.deps.DB.QueryRow(r.Context(),
		`SELECT COUNT(*) FROM zones WHERE warehouse_id = $1`, warehouseID).Scan(&zoneCount)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"warehouse_id":   warehouseID,
		"alert_stats":    alertStats,
		"vehicle_count":  vehicleCount,
		"camera_count":   cameraCount,
		"zone_count":     zoneCount,
	})
}
