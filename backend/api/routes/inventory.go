package routes

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/warehouse-intel/api/events"
	"github.com/warehouse-intel/api/models"
)

type InventoryHandler struct {
	deps *Deps
}

func NewInventoryHandler(deps *Deps) *InventoryHandler {
	return &InventoryHandler{deps: deps}
}

func (h *InventoryHandler) List(w http.ResponseWriter, r *http.Request) {
	warehouseID := chi.URLParam(r, "warehouseID")
	positions, err := models.ListRackPositions(r.Context(), h.deps.DB, warehouseID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list inventory")
		return
	}
	if positions == nil {
		positions = []models.RackPosition{}
	}
	respondJSON(w, http.StatusOK, positions)
}

func (h *InventoryHandler) Anomalies(w http.ResponseWriter, r *http.Request) {
	warehouseID := chi.URLParam(r, "warehouseID")
	anomalies, err := models.GetInventoryAnomalies(r.Context(), h.deps.DB, warehouseID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get anomalies")
		return
	}
	if anomalies == nil {
		anomalies = []models.InventorySnapshot{}
	}
	respondJSON(w, http.StatusOK, anomalies)
}

func (h *InventoryHandler) TriggerScan(w http.ResponseWriter, r *http.Request) {
	warehouseID := chi.URLParam(r, "warehouseID")

	var req struct {
		RackPositionID string `json:"rack_position_id"`
		CameraID       string `json:"camera_id"`
	}
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Create a placeholder snapshot indicating scan is in progress
	snapshot := &models.InventorySnapshot{
		RackPositionID: req.RackPositionID,
		Status:         "scanning",
	}
	if req.CameraID != "" {
		snapshot.CameraID = &req.CameraID
	}

	if err := models.CreateInventorySnapshot(r.Context(), h.deps.DB, snapshot); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to create scan")
		return
	}

	h.deps.Events.Publish(events.EventInventoryUpdated, map[string]string{
		"warehouse_id": warehouseID,
		"snapshot_id":  snapshot.ID,
	})

	respondJSON(w, http.StatusAccepted, snapshot)
}
