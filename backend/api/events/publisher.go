package events

import (
	"encoding/json"
	"log/slog"
	"sync"
	"time"
)

// EventType represents the type of event.
type EventType string

const (
	EventAlertCreated      EventType = "alert.created"
	EventAlertAcknowledged EventType = "alert.acknowledged"
	EventAlertResolved     EventType = "alert.resolved"
	EventInventoryUpdated  EventType = "inventory.updated"
	EventFleetUpdated      EventType = "fleet.updated"
	EventScanCompleted     EventType = "scan.completed"
)

// Event represents an in-memory event.
type Event struct {
	Type      EventType       `json:"type"`
	Payload   json.RawMessage `json:"payload"`
	Timestamp time.Time       `json:"timestamp"`
}

// Handler is a function that processes an event.
type Handler func(Event)

// Publisher manages in-memory event publishing and subscribing.
type Publisher struct {
	mu          sync.RWMutex
	subscribers map[EventType][]Handler
	eventCh     chan Event
	done        chan struct{}
}

// NewPublisher creates a new event publisher.
func NewPublisher() *Publisher {
	p := &Publisher{
		subscribers: make(map[EventType][]Handler),
		eventCh:     make(chan Event, 1000),
		done:        make(chan struct{}),
	}
	go p.processEvents()
	return p
}

// Publish publishes an event to all subscribers.
func (p *Publisher) Publish(eventType EventType, payload interface{}) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	event := Event{
		Type:      eventType,
		Payload:   data,
		Timestamp: time.Now(),
	}

	select {
	case p.eventCh <- event:
	default:
		slog.Warn("event channel full, dropping event", "type", eventType)
	}
	return nil
}

func (p *Publisher) processEvents() {
	for {
		select {
		case event := <-p.eventCh:
			p.mu.RLock()
			handlers := p.subscribers[event.Type]
			// Also notify wildcard subscribers
			wildcardHandlers := p.subscribers["*"]
			p.mu.RUnlock()

			for _, h := range handlers {
				go func(handler Handler) {
					defer func() {
						if r := recover(); r != nil {
							slog.Error("event handler panic", "type", event.Type, "error", r)
						}
					}()
					handler(event)
				}(h)
			}
			for _, h := range wildcardHandlers {
				go func(handler Handler) {
					defer func() {
						if r := recover(); r != nil {
							slog.Error("event handler panic", "type", event.Type, "error", r)
						}
					}()
					handler(event)
				}(h)
			}
		case <-p.done:
			return
		}
	}
}

// Subscribe registers a handler for a specific event type.
// Use "*" to subscribe to all events.
func (p *Publisher) Subscribe(eventType EventType, handler Handler) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.subscribers[eventType] = append(p.subscribers[eventType], handler)
}

// Close shuts down the publisher.
func (p *Publisher) Close() {
	close(p.done)
}
