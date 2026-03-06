package routes

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/warehouse-intel/api/config"
	"github.com/warehouse-intel/api/events"
	mw "github.com/warehouse-intel/api/middleware"
	"github.com/warehouse-intel/api/services"
	"github.com/warehouse-intel/api/telemetry"
)

func NewRouter(cfg *config.Config, pool *pgxpool.Pool, pub *events.Publisher, fb *services.FirebaseService, inf *services.InferenceService, stor *services.StorageService, collector *telemetry.Collector) http.Handler {
	r := chi.NewRouter()

	// Middleware stack
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(mw.Logging(collector))
	r.Use(chimiddleware.Recoverer)
	r.Use(mw.CORS())

	// Rate limiting
	rl := mw.NewRateLimiter(120)
	r.Use(rl.Limit)

	// Shared dependencies
	deps := &Deps{
		DB:        pool,
		Inference: inf,
		Storage:   stor,
		Firebase:  fb,
		Events:    pub,
	}

	// Handlers
	authH := NewAuthHandler(deps)
	whH := NewWarehouseHandler(deps)
	zoneH := NewZoneHandler(deps)
	camH := NewCameraHandler(deps)
	alertH := NewAlertHandler(deps)
	invH := NewInventoryHandler(deps)
	fleetH := NewFleetHandler(deps)
	analyticsH := NewAnalyticsHandler(deps)
	reportH := NewReportHandler(deps)
	productH := NewProductHandler(deps)
	shoppingH := NewShoppingListHandler(deps)
	scanH := NewScanHandler(deps)
	webhookH := NewWebhookHandler(deps)
	wsH := NewWSHandler(deps)

	// Health checks (no auth)
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})
	r.Get("/readyz", func(w http.ResponseWriter, r *http.Request) {
		if err := pool.Ping(r.Context()); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte(`{"status":"not ready"}`))
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ready"}`))
	})

	// Admin routes (no auth)
	adminH := NewAdminHandler(deps, collector, cfg)
	r.Route("/admin", func(r chi.Router) {
		r.Get("/health", adminH.Health)
		r.Get("/metrics", adminH.Metrics)
		r.Get("/requests", adminH.Requests)
		r.Get("/logs", adminH.Logs)
		r.Get("/events", adminH.Events)
		r.Get("/webhooks", adminH.Webhooks)
		r.Get("/system", adminH.System)
	})

	// API v1
	r.Route("/api/v1", func(r chi.Router) {
		// Auth middleware
		r.Use(mw.FirebaseAuth(fb))

		// Auth
		r.Route("/auth", func(r chi.Router) {
			r.Get("/me", authH.GetMe)
		})

		// Warehouses
		r.Route("/warehouses", func(r chi.Router) {
			r.Get("/", whH.List)
			r.Post("/", whH.Create)
			r.Route("/{warehouseID}", func(r chi.Router) {
				r.Get("/", whH.Get)
				r.Put("/", whH.Update)
				r.Delete("/", whH.Delete)

				// Zones
				r.Get("/zones", zoneH.ListByWarehouse)
				r.Post("/zones", zoneH.Create)

				// Cameras
				r.Get("/cameras", camH.ListByWarehouse)
				r.Post("/cameras", camH.Create)

				// Alerts
				r.Get("/alerts", alertH.ListByWarehouse)

				// Inventory
				r.Get("/inventory", invH.List)
				r.Get("/inventory/anomalies", invH.Anomalies)
				r.Post("/inventory/scan", invH.TriggerScan)

				// Fleet
				r.Get("/fleet", fleetH.List)
				r.Get("/fleet/heatmap", fleetH.Heatmap)

				// Analytics
				r.Get("/analytics/traffic", analyticsH.Traffic)
				r.Get("/analytics/safety", analyticsH.Safety)
				r.Get("/analytics/summary", analyticsH.Summary)

				// Reports
				r.Get("/reports", reportH.List)
				r.Post("/reports/generate", reportH.Generate)
			})
		})

		// Standalone resource routes
		r.Route("/zones/{zoneID}", func(r chi.Router) {
			r.Put("/", zoneH.Update)
			r.Delete("/", zoneH.Delete)
		})

		r.Route("/cameras/{cameraID}", func(r chi.Router) {
			r.Get("/", camH.Get)
			r.Put("/", camH.Update)
			r.Delete("/", camH.Delete)
			r.Post("/analyze", camH.Analyze)
		})

		r.Route("/alerts/{alertID}", func(r chi.Router) {
			r.Get("/", alertH.Get)
			r.Put("/acknowledge", alertH.Acknowledge)
			r.Put("/resolve", alertH.Resolve)
			r.Put("/dismiss", alertH.Dismiss)
		})

		r.Route("/fleet/{vehicleID}", func(r chi.Router) {
			r.Get("/trajectory", fleetH.GetTrajectory)
		})

		r.Get("/reports/{reportID}", reportH.Get)

		// Consumer - Products
		r.Route("/products", func(r chi.Router) {
			r.Post("/scan", productH.Scan)
			r.Get("/search", productH.Search)
			r.Get("/barcode/{code}", productH.BarcodeLookup)
			r.Route("/{productID}", func(r chi.Router) {
				r.Get("/", productH.Get)
				r.Get("/prices", productH.Prices)
				r.Get("/reviews", productH.Reviews)
			})
		})

		// Consumer - Shopping Lists
		r.Route("/shopping-lists", func(r chi.Router) {
			r.Get("/", shoppingH.List)
			r.Post("/", shoppingH.Create)
			r.Put("/{listID}", shoppingH.Update)
			r.Delete("/{listID}", shoppingH.Delete)
		})

		// Consumer - Scan History
		r.Route("/scans", func(r chi.Router) {
			r.Get("/", scanH.List)
			r.Get("/{scanID}", scanH.Get)
		})

		// WebSocket
		r.Get("/ws/alerts/{warehouseID}", wsH.AlertStream)
		r.Get("/ws/fleet/{warehouseID}", wsH.FleetStream)

		// Webhooks (WMS Integration) - these skip auth via middleware
		r.Post("/webhooks/inventory-update", webhookH.InventoryUpdate)
		r.Post("/webhooks/order-update", webhookH.OrderUpdate)
		r.Post("/webhooks/shipment-update", webhookH.ShipmentUpdate)
	})

	return r
}
