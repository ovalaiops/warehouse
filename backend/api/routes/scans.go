package routes

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/warehouse-intel/api/middleware"
	"github.com/warehouse-intel/api/models"
)

type ScanHandler struct {
	deps *Deps
}

func NewScanHandler(deps *Deps) *ScanHandler {
	return &ScanHandler{deps: deps}
}

func (h *ScanHandler) List(w http.ResponseWriter, r *http.Request) {
	authUser := middleware.GetAuthUser(r.Context())
	if authUser == nil {
		respondError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	user, err := models.GetUserByFirebaseUID(r.Context(), h.deps.DB, authUser.UID)
	if err != nil || user == nil {
		respondError(w, http.StatusUnauthorized, "user not found")
		return
	}

	limit := queryInt(r, "limit", 20)
	offset := queryInt(r, "offset", 0)

	scans, err := models.ListProductScans(r.Context(), h.deps.DB, user.ID, limit, offset)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list scans")
		return
	}
	if scans == nil {
		scans = []models.ProductScan{}
	}
	respondJSON(w, http.StatusOK, scans)
}

func (h *ScanHandler) Get(w http.ResponseWriter, r *http.Request) {
	scanID := chi.URLParam(r, "scanID")
	scan, err := models.GetProductScanByID(r.Context(), h.deps.DB, scanID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get scan")
		return
	}
	if scan == nil {
		respondError(w, http.StatusNotFound, "scan not found")
		return
	}
	respondJSON(w, http.StatusOK, scan)
}
