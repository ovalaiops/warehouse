package routes

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/warehouse-intel/api/middleware"
	"github.com/warehouse-intel/api/models"
)

type WarehouseHandler struct {
	deps *Deps
}

func NewWarehouseHandler(deps *Deps) *WarehouseHandler {
	return &WarehouseHandler{deps: deps}
}

func (h *WarehouseHandler) List(w http.ResponseWriter, r *http.Request) {
	authUser := middleware.GetAuthUser(r.Context())
	if authUser == nil {
		respondError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	user, err := models.GetUserByFirebaseUID(r.Context(), h.deps.DB, authUser.UID)
	if err != nil || user == nil {
		respondError(w, http.StatusInternalServerError, "failed to fetch user")
		return
	}

	if user.OrgID == nil {
		respondJSON(w, http.StatusOK, []models.Warehouse{})
		return
	}

	warehouses, err := models.ListWarehousesByOrg(r.Context(), h.deps.DB, *user.OrgID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list warehouses")
		return
	}
	if warehouses == nil {
		warehouses = []models.Warehouse{}
	}
	respondJSON(w, http.StatusOK, warehouses)
}

func (h *WarehouseHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "warehouseID")
	wh, err := models.GetWarehouseByID(r.Context(), h.deps.DB, id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get warehouse")
		return
	}
	if wh == nil {
		respondError(w, http.StatusNotFound, "warehouse not found")
		return
	}
	respondJSON(w, http.StatusOK, wh)
}

func (h *WarehouseHandler) Create(w http.ResponseWriter, r *http.Request) {
	var wh models.Warehouse
	if err := decodeJSON(r, &wh); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if wh.Name == "" || wh.OrgID == "" {
		respondError(w, http.StatusBadRequest, "name and org_id are required")
		return
	}

	if err := models.CreateWarehouse(r.Context(), h.deps.DB, &wh); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to create warehouse")
		return
	}
	respondJSON(w, http.StatusCreated, wh)
}

func (h *WarehouseHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "warehouseID")
	existing, err := models.GetWarehouseByID(r.Context(), h.deps.DB, id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get warehouse")
		return
	}
	if existing == nil {
		respondError(w, http.StatusNotFound, "warehouse not found")
		return
	}

	var update models.Warehouse
	if err := decodeJSON(r, &update); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	update.ID = id
	if update.Name == "" {
		update.Name = existing.Name
	}

	if err := models.UpdateWarehouse(r.Context(), h.deps.DB, &update); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to update warehouse")
		return
	}
	respondJSON(w, http.StatusOK, update)
}

func (h *WarehouseHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "warehouseID")
	if err := models.DeleteWarehouse(r.Context(), h.deps.DB, id); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to delete warehouse")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
