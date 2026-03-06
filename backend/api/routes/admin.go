package routes

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/warehouse-intel/api/config"
	"github.com/warehouse-intel/api/telemetry"
)

// AdminHandler serves admin telemetry and monitoring endpoints.
type AdminHandler struct {
	deps      *Deps
	collector *telemetry.Collector
	config    *config.Config
}

// NewAdminHandler creates a new AdminHandler.
func NewAdminHandler(deps *Deps, collector *telemetry.Collector, cfg *config.Config) *AdminHandler {
	return &AdminHandler{
		deps:      deps,
		collector: collector,
		config:    cfg,
	}
}

// Health returns aggregated health status of all services.
func (h *AdminHandler) Health(w http.ResponseWriter, r *http.Request) {
	checks := h.collector.GetHealthChecks(r.Context(), h.deps.DB, h.config.InferenceURL)

	// Determine overall status
	overall := "healthy"
	for _, c := range checks {
		if c.Status == "down" {
			overall = "down"
			break
		}
		if c.Status == "degraded" {
			overall = "degraded"
		}
	}

	resp := map[string]interface{}{
		"overall":  overall,
		"services": checks,
	}

	writeAdminJSON(w, http.StatusOK, resp)
}

// Metrics returns the full metrics snapshot.
func (h *AdminHandler) Metrics(w http.ResponseWriter, r *http.Request) {
	snapshot := h.collector.GetSnapshot()
	writeAdminJSON(w, http.StatusOK, snapshot)
}

// Requests returns recent request log entries.
func (h *AdminHandler) Requests(w http.ResponseWriter, r *http.Request) {
	limit := 100
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	logs := h.collector.GetRequestLogs(limit)
	writeAdminJSON(w, http.StatusOK, logs)
}

// Logs returns recent application log entries.
func (h *AdminHandler) Logs(w http.ResponseWriter, r *http.Request) {
	limit := 100
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	level := r.URL.Query().Get("level")
	logs := h.collector.GetLogs(limit, level)
	writeAdminJSON(w, http.StatusOK, logs)
}

// Events returns event statistics.
func (h *AdminHandler) Events(w http.ResponseWriter, r *http.Request) {
	snapshot := h.collector.GetSnapshot()
	resp := map[string]interface{}{
		"event_counts":   snapshot.EventCounts,
		"events_dropped": snapshot.EventsDropped,
	}
	writeAdminJSON(w, http.StatusOK, resp)
}

// Webhooks returns webhook delivery stats.
func (h *AdminHandler) Webhooks(w http.ResponseWriter, r *http.Request) {
	snapshot := h.collector.GetSnapshot()
	writeAdminJSON(w, http.StatusOK, snapshot.WebhookStats)
}

// System returns system/runtime metrics only.
func (h *AdminHandler) System(w http.ResponseWriter, r *http.Request) {
	snapshot := h.collector.GetSnapshot()
	writeAdminJSON(w, http.StatusOK, snapshot.System)
}

func writeAdminJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
