package routes

import (
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/warehouse-intel/api/events"
	"github.com/warehouse-intel/api/services"
)

// Deps holds shared dependencies for route handlers.
type Deps struct {
	DB        *pgxpool.Pool
	Inference *services.InferenceService
	Storage   *services.StorageService
	Firebase  *services.FirebaseService
	Events    *events.Publisher
}
