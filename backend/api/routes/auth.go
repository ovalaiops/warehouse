package routes

import (
	"net/http"

	"github.com/warehouse-intel/api/middleware"
	"github.com/warehouse-intel/api/models"
)

type AuthHandler struct {
	deps *Deps
}

func NewAuthHandler(deps *Deps) *AuthHandler {
	return &AuthHandler{deps: deps}
}

func (h *AuthHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	authUser := middleware.GetAuthUser(r.Context())
	if authUser == nil {
		respondError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	user, err := models.GetUserByFirebaseUID(r.Context(), h.deps.DB, authUser.UID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to fetch user")
		return
	}

	if user == nil {
		// Auto-create user on first login
		user = &models.User{
			FirebaseUID: authUser.UID,
			Email:       authUser.Email,
			Name:        authUser.Email,
			Role:        "viewer",
		}
		if err := models.CreateUser(r.Context(), h.deps.DB, user); err != nil {
			respondError(w, http.StatusInternalServerError, "failed to create user")
			return
		}
	}

	respondJSON(w, http.StatusOK, user)
}
