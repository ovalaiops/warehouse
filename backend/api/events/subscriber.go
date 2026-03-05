package events

import (
	"log/slog"
)

// Subscriber provides a convenient way to register event handlers.
type Subscriber struct {
	publisher *Publisher
}

// NewSubscriber creates a subscriber attached to a publisher.
func NewSubscriber(publisher *Publisher) *Subscriber {
	return &Subscriber{publisher: publisher}
}

// On registers a handler for a given event type.
func (s *Subscriber) On(eventType EventType, handler Handler) {
	s.publisher.Subscribe(eventType, handler)
	slog.Info("subscribed to event", "type", eventType)
}

// OnAll registers a handler for all event types.
func (s *Subscriber) OnAll(handler Handler) {
	s.publisher.Subscribe("*", handler)
	slog.Info("subscribed to all events")
}
