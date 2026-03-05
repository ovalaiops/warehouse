package routes

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"
	"github.com/warehouse-intel/api/events"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in dev
	},
}

// WSHub manages WebSocket connections grouped by warehouse.
type WSHub struct {
	mu    sync.RWMutex
	conns map[string]map[*websocket.Conn]bool // warehouseID -> set of conns
}

func NewWSHub() *WSHub {
	return &WSHub{
		conns: make(map[string]map[*websocket.Conn]bool),
	}
}

func (hub *WSHub) Register(warehouseID string, conn *websocket.Conn) {
	hub.mu.Lock()
	defer hub.mu.Unlock()
	if hub.conns[warehouseID] == nil {
		hub.conns[warehouseID] = make(map[*websocket.Conn]bool)
	}
	hub.conns[warehouseID][conn] = true
}

func (hub *WSHub) Unregister(warehouseID string, conn *websocket.Conn) {
	hub.mu.Lock()
	defer hub.mu.Unlock()
	if hub.conns[warehouseID] != nil {
		delete(hub.conns[warehouseID], conn)
		if len(hub.conns[warehouseID]) == 0 {
			delete(hub.conns, warehouseID)
		}
	}
}

func (hub *WSHub) Broadcast(warehouseID string, msg []byte) {
	hub.mu.RLock()
	conns := make(map[*websocket.Conn]bool, len(hub.conns[warehouseID]))
	for k, v := range hub.conns[warehouseID] {
		conns[k] = v
	}
	hub.mu.RUnlock()

	for conn := range conns {
		if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			slog.Error("ws write error", "error", err)
			conn.Close()
			hub.Unregister(warehouseID, conn)
		}
	}
}

type WSHandler struct {
	deps     *Deps
	alertHub *WSHub
	fleetHub *WSHub
}

func NewWSHandler(deps *Deps) *WSHandler {
	h := &WSHandler{
		deps:     deps,
		alertHub: NewWSHub(),
		fleetHub: NewWSHub(),
	}

	// Subscribe to events and broadcast to WebSocket clients
	deps.Events.Subscribe(events.EventAlertCreated, func(e events.Event) {
		var payload map[string]interface{}
		json.Unmarshal(e.Payload, &payload)
		if wid, ok := payload["warehouse_id"].(string); ok {
			msg, _ := json.Marshal(map[string]interface{}{
				"type":    "alert.created",
				"payload": payload,
			})
			h.alertHub.Broadcast(wid, msg)
		}
	})

	deps.Events.Subscribe(events.EventAlertAcknowledged, func(e events.Event) {
		h.broadcastAlertEvent(e, "alert.acknowledged")
	})

	deps.Events.Subscribe(events.EventAlertResolved, func(e events.Event) {
		h.broadcastAlertEvent(e, "alert.resolved")
	})

	deps.Events.Subscribe(events.EventFleetUpdated, func(e events.Event) {
		var payload map[string]interface{}
		json.Unmarshal(e.Payload, &payload)
		if wid, ok := payload["warehouse_id"].(string); ok {
			msg, _ := json.Marshal(map[string]interface{}{
				"type":    "fleet.updated",
				"payload": payload,
			})
			h.fleetHub.Broadcast(wid, msg)
		}
	})

	return h
}

func (h *WSHandler) broadcastAlertEvent(e events.Event, eventType string) {
	var payload map[string]interface{}
	json.Unmarshal(e.Payload, &payload)

	if alertID, ok := payload["alert_id"].(string); ok {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		var warehouseID string
		err := h.deps.DB.QueryRow(ctx, `SELECT warehouse_id FROM alerts WHERE id = $1`, alertID).Scan(&warehouseID)
		if err == nil && warehouseID != "" {
			msg, _ := json.Marshal(map[string]interface{}{
				"type":    eventType,
				"payload": payload,
			})
			h.alertHub.Broadcast(warehouseID, msg)
		}
	}
}

func (h *WSHandler) AlertStream(w http.ResponseWriter, r *http.Request) {
	warehouseID := chi.URLParam(r, "warehouseID")

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("ws upgrade failed", "error", err)
		return
	}

	h.alertHub.Register(warehouseID, conn)
	defer func() {
		h.alertHub.Unregister(warehouseID, conn)
		conn.Close()
	}()

	conn.WriteJSON(map[string]string{
		"type":    "connected",
		"message": "subscribed to alerts for warehouse " + warehouseID,
	})

	conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				if !strings.Contains(err.Error(), "close") {
					slog.Error("ws read error", "error", err)
				}
				return
			}
		}
	}()

	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (h *WSHandler) FleetStream(w http.ResponseWriter, r *http.Request) {
	warehouseID := chi.URLParam(r, "warehouseID")

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("ws upgrade failed", "error", err)
		return
	}

	h.fleetHub.Register(warehouseID, conn)
	defer func() {
		h.fleetHub.Unregister(warehouseID, conn)
		conn.Close()
	}()

	conn.WriteJSON(map[string]string{
		"type":    "connected",
		"message": "subscribed to fleet updates for warehouse " + warehouseID,
	})

	conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				return
			}
		}
	}()

	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
