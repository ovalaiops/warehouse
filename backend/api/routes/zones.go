package routes

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/warehouse-intel/api/models"
)

type ZoneHandler struct {
	deps *Deps
}

func NewZoneHandler(deps *Deps) *ZoneHandler {
	return &ZoneHandler{deps: deps}
}

func (h *ZoneHandler) ListByWarehouse(w http.ResponseWriter, r *http.Request) {
	warehouseID := chi.URLParam(r, "warehouseID")
	zones, err := models.ListZonesByWarehouse(r.Context(), h.deps.DB, warehouseID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list zones")
		return
	}
	if zones == nil {
		zones = []models.Zone{}
	}
	respondJSON(w, http.StatusOK, zones)
}

func (h *ZoneHandler) Create(w http.ResponseWriter, r *http.Request) {
	warehouseID := chi.URLParam(r, "warehouseID")
	var z models.Zone
	if err := decodeJSON(r, &z); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	z.WarehouseID = warehouseID
	if z.Name == "" || z.Type == "" {
		respondError(w, http.StatusBadRequest, "name and type are required")
		return
	}

	if err := models.CreateZone(r.Context(), h.deps.DB, &z); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to create zone")
		return
	}
	respondJSON(w, http.StatusCreated, z)
}

func (h *ZoneHandler) Update(w http.ResponseWriter, r *http.Request) {
	zoneID := chi.URLParam(r, "zoneID")
	existing, err := models.GetZoneByID(r.Context(), h.deps.DB, zoneID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get zone")
		return
	}
	if existing == nil {
		respondError(w, http.StatusNotFound, "zone not found")
		return
	}

	var update models.Zone
	if err := decodeJSON(r, &update); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	update.ID = zoneID
	if update.Name == "" {
		update.Name = existing.Name
	}
	if update.Type == "" {
		update.Type = existing.Type
	}
	if update.Bounds == nil {
		update.Bounds = existing.Bounds
	}

	if err := models.UpdateZone(r.Context(), h.deps.DB, &update); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to update zone")
		return
	}
	respondJSON(w, http.StatusOK, update)
}

func (h *ZoneHandler) Delete(w http.ResponseWriter, r *http.Request) {
	zoneID := chi.URLParam(r, "zoneID")
	if err := models.DeleteZone(r.Context(), h.deps.DB, zoneID); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to delete zone")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
