package routes

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/warehouse-intel/api/middleware"
	"github.com/warehouse-intel/api/models"
)

type ShoppingListHandler struct {
	deps *Deps
}

func NewShoppingListHandler(deps *Deps) *ShoppingListHandler {
	return &ShoppingListHandler{deps: deps}
}

func (h *ShoppingListHandler) List(w http.ResponseWriter, r *http.Request) {
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

	lists, err := models.ListShoppingLists(r.Context(), h.deps.DB, user.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list shopping lists")
		return
	}
	if lists == nil {
		lists = []models.ShoppingList{}
	}
	respondJSON(w, http.StatusOK, lists)
}

func (h *ShoppingListHandler) Create(w http.ResponseWriter, r *http.Request) {
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

	var list models.ShoppingList
	if err := decodeJSON(r, &list); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	list.UserID = user.ID
	if list.Name == "" {
		list.Name = "My List"
	}

	if err := models.CreateShoppingList(r.Context(), h.deps.DB, &list); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to create shopping list")
		return
	}
	respondJSON(w, http.StatusCreated, list)
}

func (h *ShoppingListHandler) Update(w http.ResponseWriter, r *http.Request) {
	listID := chi.URLParam(r, "listID")
	existing, err := models.GetShoppingListByID(r.Context(), h.deps.DB, listID)
	if err != nil || existing == nil {
		respondError(w, http.StatusNotFound, "shopping list not found")
		return
	}

	var update models.ShoppingList
	if err := decodeJSON(r, &update); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	update.ID = listID
	if update.Name == "" {
		update.Name = existing.Name
	}
	if update.Items == nil {
		update.Items = existing.Items
	}

	if err := models.UpdateShoppingList(r.Context(), h.deps.DB, &update); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to update shopping list")
		return
	}
	respondJSON(w, http.StatusOK, update)
}

func (h *ShoppingListHandler) Delete(w http.ResponseWriter, r *http.Request) {
	listID := chi.URLParam(r, "listID")
	if err := models.DeleteShoppingList(r.Context(), h.deps.DB, listID); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to delete shopping list")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
