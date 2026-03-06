package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/warehouse-intel/api/config"
	"github.com/warehouse-intel/api/db"
	"github.com/warehouse-intel/api/events"
	"github.com/warehouse-intel/api/routes"
	"github.com/warehouse-intel/api/services"
	"github.com/warehouse-intel/api/telemetry"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	// Database
	ctx := context.Background()
	database, err := db.New(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer database.Close()
	slog.Info("database connected")

	// Services
	fb, err := services.NewFirebaseService(cfg.FirebaseProjectID)
	if err != nil {
		slog.Error("failed to init firebase", "error", err)
		os.Exit(1)
	}

	inf := services.NewInferenceService(cfg.InferenceURL)
	stor := services.NewStorageService(cfg.CloudStorageBucket)

	// Telemetry
	collector := telemetry.NewCollector()

	// Events
	pub := events.NewPublisher()
	pub.SetCollector(collector)
	defer pub.Close()

	// Router
	router := routes.NewRouter(cfg, database.Pool, pub, fb, inf, stor, collector)

	// Server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		slog.Info("starting server", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	<-quit
	slog.Info("shutting down server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("server forced shutdown", "error", err)
	}

	slog.Info("server stopped")
}
