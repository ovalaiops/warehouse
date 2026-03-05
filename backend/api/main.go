package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/warehouse-intel/api/config"
	"github.com/warehouse-intel/api/routes"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	router := routes.NewRouter(cfg)

	slog.Info("starting server", "port", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, router); err != nil {
		slog.Error("server failed", "error", err)
		os.Exit(1)
	}
}
