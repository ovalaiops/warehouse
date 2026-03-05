package routes

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/warehouse-intel/api/config"
)

func NewRouter(cfg *config.Config) http.Handler {
	r := chi.NewRouter()

	// Middleware
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "https://*.netlify.app"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health checks
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})
	r.Get("/readyz", func(w http.ResponseWriter, r *http.Request) {
		// TODO: check DB connection, inference server
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	// API v1
	r.Route("/api/v1", func(r chi.Router) {
		// TODO: Add Firebase auth middleware
		// r.Use(middleware.FirebaseAuth(cfg))

		// Auth
		r.Route("/auth", func(r chi.Router) {
			r.Get("/me", handleNotImplemented)
		})

		// Warehouses
		r.Route("/warehouses", func(r chi.Router) {
			r.Get("/", handleNotImplemented)
			r.Post("/", handleNotImplemented)
			r.Route("/{warehouseID}", func(r chi.Router) {
				r.Get("/", handleNotImplemented)
				r.Put("/", handleNotImplemented)
				r.Delete("/", handleNotImplemented)

				// Zones
				r.Get("/zones", handleNotImplemented)
				r.Post("/zones", handleNotImplemented)

				// Cameras
				r.Get("/cameras", handleNotImplemented)
				r.Post("/cameras", handleNotImplemented)

				// Alerts
				r.Get("/alerts", handleNotImplemented)

				// Inventory
				r.Get("/inventory", handleNotImplemented)
				r.Get("/inventory/anomalies", handleNotImplemented)
				r.Post("/inventory/scan", handleNotImplemented)

				// Fleet
				r.Get("/fleet", handleNotImplemented)
				r.Get("/fleet/heatmap", handleNotImplemented)

				// Analytics
				r.Get("/analytics/traffic", handleNotImplemented)
				r.Get("/analytics/safety", handleNotImplemented)
				r.Get("/analytics/summary", handleNotImplemented)

				// Reports
				r.Get("/reports", handleNotImplemented)
				r.Post("/reports/generate", handleNotImplemented)
			})
		})

		// Standalone resource routes
		r.Route("/zones/{zoneID}", func(r chi.Router) {
			r.Put("/", handleNotImplemented)
			r.Delete("/", handleNotImplemented)
		})

		r.Route("/cameras/{cameraID}", func(r chi.Router) {
			r.Get("/", handleNotImplemented)
			r.Put("/", handleNotImplemented)
			r.Delete("/", handleNotImplemented)
			r.Post("/analyze", handleNotImplemented)
		})

		r.Route("/alerts/{alertID}", func(r chi.Router) {
			r.Get("/", handleNotImplemented)
			r.Put("/acknowledge", handleNotImplemented)
			r.Put("/resolve", handleNotImplemented)
			r.Put("/dismiss", handleNotImplemented)
		})

		r.Route("/fleet/{vehicleID}", func(r chi.Router) {
			r.Get("/trajectory", handleNotImplemented)
		})

		r.Get("/reports/{reportID}", handleNotImplemented)

		// Consumer - Products
		r.Route("/products", func(r chi.Router) {
			r.Post("/scan", handleNotImplemented)
			r.Get("/search", handleNotImplemented)
			r.Get("/barcode/{code}", handleNotImplemented)
			r.Route("/{productID}", func(r chi.Router) {
				r.Get("/", handleNotImplemented)
				r.Get("/prices", handleNotImplemented)
				r.Get("/reviews", handleNotImplemented)
			})
		})

		// Consumer - Shopping Lists
		r.Route("/shopping-lists", func(r chi.Router) {
			r.Get("/", handleNotImplemented)
			r.Post("/", handleNotImplemented)
			r.Put("/{listID}", handleNotImplemented)
			r.Delete("/{listID}", handleNotImplemented)
		})

		// Consumer - Scan History
		r.Route("/scans", func(r chi.Router) {
			r.Get("/", handleNotImplemented)
			r.Get("/{scanID}", handleNotImplemented)
		})

		// WebSocket
		r.Get("/ws/alerts/{warehouseID}", handleNotImplemented)
		r.Get("/ws/fleet/{warehouseID}", handleNotImplemented)

		// Webhooks (WMS Integration)
		r.Post("/webhooks/inventory-update", handleNotImplemented)
		r.Post("/webhooks/order-update", handleNotImplemented)
		r.Post("/webhooks/shipment-update", handleNotImplemented)
	})

	return r
}

func handleNotImplemented(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	w.Write([]byte(`{"error": "not implemented"}`))
}
