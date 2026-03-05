package services

import (
	"context"
	"fmt"
	"log/slog"
)

// TokenClaims holds verified token claims.
type TokenClaims struct {
	UID   string
	Email string
}

// FirebaseService wraps Firebase Admin SDK operations.
type FirebaseService struct {
	projectID string
	devMode   bool
}

// NewFirebaseService creates a new Firebase service.
func NewFirebaseService(projectID string) (*FirebaseService, error) {
	devMode := projectID == "warehouse-intel-dev"

	if devMode {
		slog.Warn("firebase running in dev mode - tokens will NOT be verified")
	}

	return &FirebaseService{
		projectID: projectID,
		devMode:   devMode,
	}, nil
}

// VerifyToken verifies a Firebase ID token.
func (s *FirebaseService) VerifyToken(ctx context.Context, idToken string) (*TokenClaims, error) {
	if s.devMode {
		// In dev mode, accept any token and return mock claims.
		// The token itself is treated as the UID for testing.
		uid := idToken
		if uid == "" {
			uid = "dev-user-001"
		}
		return &TokenClaims{
			UID:   uid,
			Email: "dev@warehouse-intel.local",
		}, nil
	}

	// Production: use Firebase Admin SDK to verify the token.
	// This requires firebase.google.com/go/v4 and proper credentials.
	// For now, return an error indicating setup is needed.
	return nil, fmt.Errorf("firebase verification not configured for project %s", s.projectID)
}

// GetUserByUID fetches a Firebase user record by UID.
func (s *FirebaseService) GetUserByUID(ctx context.Context, uid string) (*TokenClaims, error) {
	if s.devMode {
		return &TokenClaims{
			UID:   uid,
			Email: "dev@warehouse-intel.local",
		}, nil
	}

	return nil, fmt.Errorf("firebase user lookup not configured for project %s", s.projectID)
}

// IsDevMode returns whether the service is in development mode.
func (s *FirebaseService) IsDevMode() bool {
	return s.devMode
}
