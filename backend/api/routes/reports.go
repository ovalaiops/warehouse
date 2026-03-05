package routes

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/warehouse-intel/api/models"
)

type ReportHandler struct {
	deps *Deps
}

func NewReportHandler(deps *Deps) *ReportHandler {
	return &ReportHandler{deps: deps}
}

func (h *ReportHandler) List(w http.ResponseWriter, r *http.Request) {
	warehouseID := chi.URLParam(r, "warehouseID")
	limit := queryInt(r, "limit", 20)
	offset := queryInt(r, "offset", 0)

	reports, err := models.ListReports(r.Context(), h.deps.DB, warehouseID, limit, offset)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list reports")
		return
	}
	if reports == nil {
		reports = []models.ShiftReport{}
	}
	respondJSON(w, http.StatusOK, reports)
}

func (h *ReportHandler) Get(w http.ResponseWriter, r *http.Request) {
	reportID := chi.URLParam(r, "reportID")
	report, err := models.GetReportByID(r.Context(), h.deps.DB, reportID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get report")
		return
	}
	if report == nil {
		respondError(w, http.StatusNotFound, "report not found")
		return
	}
	respondJSON(w, http.StatusOK, report)
}

func (h *ReportHandler) Generate(w http.ResponseWriter, r *http.Request) {
	warehouseID := chi.URLParam(r, "warehouseID")

	var req struct {
		ShiftStart string `json:"shift_start"`
		ShiftEnd   string `json:"shift_end"`
	}
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	shiftStart, err := time.Parse(time.RFC3339, req.ShiftStart)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid shift_start format (use RFC3339)")
		return
	}
	shiftEnd, err := time.Parse(time.RFC3339, req.ShiftEnd)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid shift_end format (use RFC3339)")
		return
	}

	// Gather metrics for the shift
	alertStats, _ := models.GetAlertStats(r.Context(), h.deps.DB, warehouseID)
	metrics, _ := json.Marshal(map[string]interface{}{
		"alert_stats": alertStats,
		"generated":   time.Now(),
	})

	summary := "Shift report generated automatically."
	report := &models.ShiftReport{
		WarehouseID: warehouseID,
		ShiftStart:  shiftStart,
		ShiftEnd:    shiftEnd,
		Summary:     &summary,
		Metrics:     metrics,
	}

	if err := models.CreateReport(r.Context(), h.deps.DB, report); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to create report")
		return
	}
	respondJSON(w, http.StatusCreated, report)
}
