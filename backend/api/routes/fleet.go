package routes

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/warehouse-intel/api/models"
)

type FleetHandler struct {
	deps *Deps
}

func NewFleetHandler(deps *Deps) *FleetHandler {
	return &FleetHandler{deps: deps}
}

func (h *FleetHandler) List(w http.ResponseWriter, r *http.Request) {
	warehouseID := chi.URLParam(r, "warehouseID")
	vehicles, err := models.ListFleetVehicles(r.Context(), h.deps.DB, warehouseID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list fleet")
		return
	}
	if vehicles == nil {
		vehicles = []models.FleetVehicle{}
	}
	respondJSON(w, http.StatusOK, vehicles)
}

func (h *FleetHandler) GetTrajectory(w http.ResponseWriter, r *http.Request) {
	vehicleID := chi.URLParam(r, "vehicleID")
	trajectories, err := models.GetVehicleTrajectory(r.Context(), h.deps.DB, vehicleID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get trajectory")
		return
	}
	if trajectories == nil {
		trajectories = []models.VehicleTrajectory{}
	}
	respondJSON(w, http.StatusOK, trajectories)
}

func (h *FleetHandler) Heatmap(w http.ResponseWriter, r *http.Request) {
	warehouseID := chi.URLParam(r, "warehouseID")

	// Aggregate trajectory data into heatmap format
	rows, err := h.deps.DB.Query(r.Context(),
		`SELECT vt.path
		 FROM vehicle_trajectories vt
		 JOIN fleet_vehicles fv ON fv.id = vt.vehicle_id
		 WHERE fv.warehouse_id = $1
		 ORDER BY vt.recorded_at DESC LIMIT 500`, warehouseID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get heatmap data")
		return
	}
	defer rows.Close()

	var paths []json.RawMessage
	for rows.Next() {
		var path json.RawMessage
		if err := rows.Scan(&path); err != nil {
			continue
		}
		paths = append(paths, path)
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"warehouse_id": warehouseID,
		"paths":        paths,
	})
}
