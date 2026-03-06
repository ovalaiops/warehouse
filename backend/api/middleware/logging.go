package middleware

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/warehouse-intel/api/telemetry"
)

type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.status = code
	rw.ResponseWriter.WriteHeader(code)
}

// Logging returns a structured request logging middleware using slog.
// It also records request metrics in the provided telemetry collector.
func Logging(collector *telemetry.Collector) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			wrapped := &responseWriter{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(wrapped, r)

			latencyMs := time.Since(start).Milliseconds()

			slog.Info("request",
				"method", r.Method,
				"path", r.URL.Path,
				"status", wrapped.status,
				"duration_ms", latencyMs,
				"remote_addr", r.RemoteAddr,
			)

			if collector != nil {
				collector.RecordRequest(
					r.Method,
					r.URL.Path,
					wrapped.status,
					latencyMs,
					r.RemoteAddr,
					r.UserAgent(),
				)

				if wrapped.status >= 500 {
					collector.AddLog("error", "server error", map[string]interface{}{
						"method": r.Method,
						"path":   r.URL.Path,
						"status": wrapped.status,
					})
				}
			}
		})
	}
}
