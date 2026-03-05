package routes

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/warehouse-intel/api/events"
	"github.com/warehouse-intel/api/models"
)

type AlertHandler struct {
	deps *Deps
}

func NewAlertHandler(deps *Deps) *AlertHandler {
	return &AlertHandler{deps: deps}
}

func (h *AlertHandler) ListByWarehouse(w http.ResponseWriter, r *http.Request) {
	warehouseID := chi.URLParam(r, "warehouseID")
	filter := models.AlertFilter{
		WarehouseID: warehouseID,
		Type:        r.URL.Query().Get("type"),
		Severity:    r.URL.Query().Get("severity"),
		Status:      r.URL.Query().Get("status"),
		Limit:       queryInt(r, "limit", 50),
		Offset:      queryInt(r, "offset", 0),
	}

	alerts, total, err := models.ListAlerts(r.Context(), h.deps.DB, filter)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list alerts")
		return
	}
	if alerts == nil {
		alerts = []models.Alert{}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"alerts": alerts,
		"total":  total,
		"limit":  filter.Limit,
		"offset": filter.Offset,
	})
}

func (h *AlertHandler) Get(w http.ResponseWriter, r *http.Request) {
	alertID := chi.URLParam(r, "alertID")
	alert, err := models.GetAlertByID(r.Context(), h.deps.DB, alertID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get alert")
		return
	}
	if alert == nil {
		respondError(w, http.StatusNotFound, "alert not found")
		return
	}
	respondJSON(w, http.StatusOK, alert)
}

func (h *AlertHandler) Acknowledge(w http.ResponseWriter, r *http.Request) {
	alertID := chi.URLParam(r, "alertID")
	if err := models.UpdateAlertStatus(r.Context(), h.deps.DB, alertID, "acknowledged"); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to acknowledge alert")
		return
	}
	h.deps.Events.Publish(events.EventAlertAcknowledged, map[string]string{"alert_id": alertID})
	respondJSON(w, http.StatusOK, map[string]string{"status": "acknowledged"})
}

func (h *AlertHandler) Resolve(w http.ResponseWriter, r *http.Request) {
	alertID := chi.URLParam(r, "alertID")
	if err := models.UpdateAlertStatus(r.Context(), h.deps.DB, alertID, "resolved"); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to resolve alert")
		return
	}
	h.deps.Events.Publish(events.EventAlertResolved, map[string]string{"alert_id": alertID})
	respondJSON(w, http.StatusOK, map[string]string{"status": "resolved"})
}

func (h *AlertHandler) Dismiss(w http.ResponseWriter, r *http.Request) {
	alertID := chi.URLParam(r, "alertID")
	if err := models.UpdateAlertStatus(r.Context(), h.deps.DB, alertID, "dismissed"); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to dismiss alert")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "dismissed"})
}
