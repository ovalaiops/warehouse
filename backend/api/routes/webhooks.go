package routes

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"log/slog"
	"net/http"

	"github.com/warehouse-intel/api/events"
)

type WebhookHandler struct {
	deps      *Deps
	secretKey string
}

func NewWebhookHandler(deps *Deps) *WebhookHandler {
	return &WebhookHandler{
		deps:      deps,
		secretKey: "webhook-secret", // In production, load from config
	}
}

func (h *WebhookHandler) validateSignature(r *http.Request, body []byte) bool {
	signature := r.Header.Get("X-Webhook-Signature")
	if signature == "" {
		return false
	}

	mac := hmac.New(sha256.New, []byte(h.secretKey))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expected))
}

func (h *WebhookHandler) InventoryUpdate(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		respondError(w, http.StatusBadRequest, "failed to read body")
		return
	}
	defer r.Body.Close()

	// In dev mode, skip signature validation
	if !h.deps.Firebase.IsDevMode() {
		if !h.validateSignature(r, body) {
			respondError(w, http.StatusUnauthorized, "invalid webhook signature")
			return
		}
	}

	slog.Info("received inventory webhook", "size", len(body))
	h.deps.Events.Publish(events.EventInventoryUpdated, map[string]interface{}{
		"source": "wms_webhook",
		"data":   string(body),
	})
	respondJSON(w, http.StatusOK, map[string]string{"status": "received"})
}

func (h *WebhookHandler) OrderUpdate(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		respondError(w, http.StatusBadRequest, "failed to read body")
		return
	}
	defer r.Body.Close()

	if !h.deps.Firebase.IsDevMode() {
		if !h.validateSignature(r, body) {
			respondError(w, http.StatusUnauthorized, "invalid webhook signature")
			return
		}
	}

	slog.Info("received order webhook", "size", len(body))
	respondJSON(w, http.StatusOK, map[string]string{"status": "received"})
}

func (h *WebhookHandler) ShipmentUpdate(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		respondError(w, http.StatusBadRequest, "failed to read body")
		return
	}
	defer r.Body.Close()

	if !h.deps.Firebase.IsDevMode() {
		if !h.validateSignature(r, body) {
			respondError(w, http.StatusUnauthorized, "invalid webhook signature")
			return
		}
	}

	slog.Info("received shipment webhook", "size", len(body))
	respondJSON(w, http.StatusOK, map[string]string{"status": "received"})
}
