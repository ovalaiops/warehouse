package routes

import (
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/warehouse-intel/api/models"
	"github.com/warehouse-intel/api/services"
)

type CameraHandler struct {
	deps *Deps
}

func NewCameraHandler(deps *Deps) *CameraHandler {
	return &CameraHandler{deps: deps}
}

func (h *CameraHandler) ListByWarehouse(w http.ResponseWriter, r *http.Request) {
	warehouseID := chi.URLParam(r, "warehouseID")
	cameras, err := models.ListCamerasByWarehouse(r.Context(), h.deps.DB, warehouseID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list cameras")
		return
	}
	if cameras == nil {
		cameras = []models.Camera{}
	}
	respondJSON(w, http.StatusOK, cameras)
}

func (h *CameraHandler) Get(w http.ResponseWriter, r *http.Request) {
	cameraID := chi.URLParam(r, "cameraID")
	camera, err := models.GetCameraByID(r.Context(), h.deps.DB, cameraID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get camera")
		return
	}
	if camera == nil {
		respondError(w, http.StatusNotFound, "camera not found")
		return
	}
	respondJSON(w, http.StatusOK, camera)
}

func (h *CameraHandler) Create(w http.ResponseWriter, r *http.Request) {
	warehouseID := chi.URLParam(r, "warehouseID")
	var c models.Camera
	if err := decodeJSON(r, &c); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	c.WarehouseID = warehouseID
	if c.Name == "" {
		respondError(w, http.StatusBadRequest, "name is required")
		return
	}
	if c.Status == "" {
		c.Status = "active"
	}

	if err := models.CreateCamera(r.Context(), h.deps.DB, &c); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to create camera")
		return
	}
	respondJSON(w, http.StatusCreated, c)
}

func (h *CameraHandler) Update(w http.ResponseWriter, r *http.Request) {
	cameraID := chi.URLParam(r, "cameraID")
	existing, err := models.GetCameraByID(r.Context(), h.deps.DB, cameraID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get camera")
		return
	}
	if existing == nil {
		respondError(w, http.StatusNotFound, "camera not found")
		return
	}

	var update models.Camera
	if err := decodeJSON(r, &update); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	update.ID = cameraID
	if update.Name == "" {
		update.Name = existing.Name
	}
	if update.Status == "" {
		update.Status = existing.Status
	}

	if err := models.UpdateCamera(r.Context(), h.deps.DB, &update); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to update camera")
		return
	}
	respondJSON(w, http.StatusOK, update)
}

func (h *CameraHandler) Delete(w http.ResponseWriter, r *http.Request) {
	cameraID := chi.URLParam(r, "cameraID")
	if err := models.DeleteCamera(r.Context(), h.deps.DB, cameraID); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to delete camera")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *CameraHandler) Analyze(w http.ResponseWriter, r *http.Request) {
	cameraID := chi.URLParam(r, "cameraID")
	camera, err := models.GetCameraByID(r.Context(), h.deps.DB, cameraID)
	if err != nil || camera == nil {
		respondError(w, http.StatusNotFound, "camera not found")
		return
	}

	// Read uploaded image/video
	file, header, err := r.FormFile("file")
	if err != nil {
		respondError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	imageData, err := io.ReadAll(file)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to read file")
		return
	}

	analysisType := r.FormValue("type")
	if analysisType == "" {
		analysisType = "safety"
	}

	req := &services.InferenceRequest{
		ImageData: imageData,
		FileName:  header.Filename,
		Metadata: map[string]string{
			"camera_id":    cameraID,
			"warehouse_id": camera.WarehouseID,
		},
	}

	var result *services.InferenceResponse
	switch analysisType {
	case "safety":
		result, err = h.deps.Inference.InferSafety(r.Context(), req)
	case "inventory":
		result, err = h.deps.Inference.InferInventory(r.Context(), req)
	case "fleet":
		result, err = h.deps.Inference.InferFleet(r.Context(), req)
	default:
		result, err = h.deps.Inference.InferSafety(r.Context(), req)
	}

	if err != nil {
		respondError(w, http.StatusBadGateway, "inference service error: "+err.Error())
		return
	}
	respondJSON(w, http.StatusOK, result)
}
