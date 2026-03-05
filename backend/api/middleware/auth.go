package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/warehouse-intel/api/services"
)

type contextKey string

const UserContextKey contextKey = "user"

type AuthUser struct {
	UID   string `json:"uid"`
	Email string `json:"email"`
}

func FirebaseAuth(fb *services.FirebaseService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip auth for health checks
			path := r.URL.Path
			if path == "/healthz" || path == "/readyz" {
				next.ServeHTTP(w, r)
				return
			}

			// Skip auth for webhook endpoints (they use signature verification)
			if strings.HasPrefix(path, "/api/v1/webhooks/") {
				next.ServeHTTP(w, r)
				return
			}

			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "missing authorization header"})
				return
			}

			token := strings.TrimPrefix(authHeader, "Bearer ")
			if token == authHeader {
				writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid authorization format"})
				return
			}

			claims, err := fb.VerifyToken(r.Context(), token)
			if err != nil {
				writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid token"})
				return
			}

			user := &AuthUser{
				UID:   claims.UID,
				Email: claims.Email,
			}

			ctx := context.WithValue(r.Context(), UserContextKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetAuthUser(ctx context.Context) *AuthUser {
	u, _ := ctx.Value(UserContextKey).(*AuthUser)
	return u
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
