package telemetry

import (
	"context"
	"fmt"
	"net/http"
	"runtime"
	"sort"
	"sync"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	maxRequestLogs = 1000
	maxLogEntries  = 500
)

// Collector is a singleton metrics collector that tracks request, system, event,
// webhook, and connection metrics for the admin telemetry dashboard.
type Collector struct {
	startTime time.Time
	mu        sync.RWMutex

	// Request metrics
	totalRequests    int64
	requestsByPath   map[string]*PathMetrics
	requestsByStatus map[int]int64

	// Latency tracking (ring buffer of last 1000 requests)
	latencies  []RequestLog
	latencyIdx int
	latencyLen int

	// Event metrics
	eventsByType  map[string]int64
	eventsDropped int64

	// Webhook metrics
	webhooksByType map[string]*WebhookMetrics

	// Active connections
	wsConnections int64

	// Recent logs (ring buffer of last 500 entries)
	logs   []LogEntry
	logIdx int
	logLen int
}

// PathMetrics tracks per-path request statistics.
type PathMetrics struct {
	Count        int64 `json:"count"`
	ErrorCount   int64 `json:"error_count"`
	TotalLatency int64 `json:"total_latency_ms"`
	MinLatency   int64 `json:"min_latency_ms"`
	MaxLatency   int64 `json:"max_latency_ms"`
}

// WebhookMetrics tracks per-type webhook delivery statistics.
type WebhookMetrics struct {
	Received  int64     `json:"received"`
	Succeeded int64     `json:"succeeded"`
	Failed    int64     `json:"failed"`
	LastAt    time.Time `json:"last_at"`
}

// RequestLog represents a single request log entry.
type RequestLog struct {
	Method     string    `json:"method"`
	Path       string    `json:"path"`
	Status     int       `json:"status"`
	LatencyMs  int64     `json:"latency_ms"`
	RemoteAddr string    `json:"remote_addr"`
	UserAgent  string    `json:"user_agent"`
	Timestamp  time.Time `json:"timestamp"`
}

// LogEntry represents a structured application log entry.
type LogEntry struct {
	Level     string                 `json:"level"`
	Message   string                 `json:"message"`
	Fields    map[string]interface{} `json:"fields,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
}

// HealthStatus represents the health of a dependent service.
type HealthStatus struct {
	Service   string    `json:"service"`
	Status    string    `json:"status"` // "healthy", "degraded", "down"
	LatencyMs int64     `json:"latency_ms"`
	Details   string    `json:"details,omitempty"`
	CheckedAt time.Time `json:"checked_at"`
}

// MetricsSnapshot is a JSON-serializable snapshot of all metrics.
type MetricsSnapshot struct {
	Uptime         string                    `json:"uptime"`
	UptimeSeconds  int64                     `json:"uptime_seconds"`
	TotalRequests  int64                     `json:"total_requests"`
	ErrorRate      float64                   `json:"error_rate"`
	RequestsPerMin float64                   `json:"requests_per_min"`
	LatencyP50     int64                     `json:"latency_p50_ms"`
	LatencyP95     int64                     `json:"latency_p95_ms"`
	LatencyP99     int64                     `json:"latency_p99_ms"`
	TopEndpoints   []EndpointStats           `json:"top_endpoints"`
	StatusCodes    map[int]int64             `json:"status_codes"`
	EventCounts    map[string]int64          `json:"event_counts"`
	EventsDropped  int64                     `json:"events_dropped"`
	WebhookStats   map[string]*WebhookMetrics `json:"webhook_stats"`
	WSConnections  int64                     `json:"ws_connections"`
	System         SystemMetrics             `json:"system"`
}

// SystemMetrics captures Go runtime statistics.
type SystemMetrics struct {
	Goroutines   int     `json:"goroutines"`
	MemAllocMB   float64 `json:"mem_alloc_mb"`
	MemSysMB     float64 `json:"mem_sys_mb"`
	HeapObjectsK float64 `json:"heap_objects_k"`
	GCPauseMs    float64 `json:"gc_pause_ms"`
	NumGC        uint32  `json:"num_gc"`
}

// EndpointStats summarizes per-endpoint metrics for the top endpoints.
type EndpointStats struct {
	Path         string  `json:"path"`
	Count        int64   `json:"count"`
	ErrorCount   int64   `json:"error_count"`
	AvgLatencyMs float64 `json:"avg_latency_ms"`
	MaxLatencyMs int64   `json:"max_latency_ms"`
}

// NewCollector creates a new metrics collector.
func NewCollector() *Collector {
	return &Collector{
		startTime:        time.Now(),
		requestsByPath:   make(map[string]*PathMetrics),
		requestsByStatus: make(map[int]int64),
		latencies:        make([]RequestLog, maxRequestLogs),
		eventsByType:     make(map[string]int64),
		webhooksByType:   make(map[string]*WebhookMetrics),
		logs:             make([]LogEntry, maxLogEntries),
	}
}

// RecordRequest records metrics for a completed HTTP request.
func (c *Collector) RecordRequest(method, path string, status int, latencyMs int64, remoteAddr, userAgent string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.totalRequests++

	// Status code tracking
	c.requestsByStatus[status]++

	// Path metrics
	pm, ok := c.requestsByPath[path]
	if !ok {
		pm = &PathMetrics{MinLatency: latencyMs, MaxLatency: latencyMs}
		c.requestsByPath[path] = pm
	}
	pm.Count++
	pm.TotalLatency += latencyMs
	if latencyMs < pm.MinLatency {
		pm.MinLatency = latencyMs
	}
	if latencyMs > pm.MaxLatency {
		pm.MaxLatency = latencyMs
	}
	if status >= 400 {
		pm.ErrorCount++
	}

	// Ring buffer for latency tracking
	c.latencies[c.latencyIdx] = RequestLog{
		Method:     method,
		Path:       path,
		Status:     status,
		LatencyMs:  latencyMs,
		RemoteAddr: remoteAddr,
		UserAgent:  userAgent,
		Timestamp:  time.Now(),
	}
	c.latencyIdx = (c.latencyIdx + 1) % maxRequestLogs
	if c.latencyLen < maxRequestLogs {
		c.latencyLen++
	}
}

// RecordEvent records that an event of the given type was published.
func (c *Collector) RecordEvent(eventType string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.eventsByType[eventType]++
}

// RecordEventDropped records that an event was dropped.
func (c *Collector) RecordEventDropped() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.eventsDropped++
}

// RecordWebhook records a webhook delivery attempt.
func (c *Collector) RecordWebhook(webhookType string, success bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	wm, ok := c.webhooksByType[webhookType]
	if !ok {
		wm = &WebhookMetrics{}
		c.webhooksByType[webhookType] = wm
	}
	wm.Received++
	if success {
		wm.Succeeded++
	} else {
		wm.Failed++
	}
	wm.LastAt = time.Now()
}

// IncrWSConnections increments the active WebSocket connection count.
func (c *Collector) IncrWSConnections() {
	atomic.AddInt64(&c.wsConnections, 1)
}

// DecrWSConnections decrements the active WebSocket connection count.
func (c *Collector) DecrWSConnections() {
	atomic.AddInt64(&c.wsConnections, -1)
}

// AddLog adds a structured log entry to the ring buffer.
func (c *Collector) AddLog(level, message string, fields map[string]interface{}) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.logs[c.logIdx] = LogEntry{
		Level:     level,
		Message:   message,
		Fields:    fields,
		Timestamp: time.Now(),
	}
	c.logIdx = (c.logIdx + 1) % maxLogEntries
	if c.logLen < maxLogEntries {
		c.logLen++
	}
}

// GetSnapshot returns a point-in-time snapshot of all collected metrics.
func (c *Collector) GetSnapshot() *MetricsSnapshot {
	c.mu.RLock()
	defer c.mu.RUnlock()

	uptime := time.Since(c.startTime)

	// Error rate
	var errorCount int64
	for code, count := range c.requestsByStatus {
		if code >= 400 {
			errorCount += count
		}
	}
	var errorRate float64
	if c.totalRequests > 0 {
		errorRate = float64(errorCount) / float64(c.totalRequests)
	}

	// Requests per minute
	var reqPerMin float64
	uptimeMin := uptime.Minutes()
	if uptimeMin > 0 {
		reqPerMin = float64(c.totalRequests) / uptimeMin
	}

	// Percentiles from the ring buffer
	p50, p95, p99 := c.computePercentiles()

	// Top endpoints by count
	topEndpoints := c.topEndpoints(10)

	// Copy status codes
	statusCodes := make(map[int]int64, len(c.requestsByStatus))
	for k, v := range c.requestsByStatus {
		statusCodes[k] = v
	}

	// Copy event counts
	eventCounts := make(map[string]int64, len(c.eventsByType))
	for k, v := range c.eventsByType {
		eventCounts[k] = v
	}

	// Copy webhook stats
	webhookStats := make(map[string]*WebhookMetrics, len(c.webhooksByType))
	for k, v := range c.webhooksByType {
		cp := *v
		webhookStats[k] = &cp
	}

	// System metrics
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	var lastGCPause float64
	if memStats.NumGC > 0 {
		lastGCPause = float64(memStats.PauseNs[(memStats.NumGC+255)%256]) / 1e6
	}

	return &MetricsSnapshot{
		Uptime:         formatDuration(uptime),
		UptimeSeconds:  int64(uptime.Seconds()),
		TotalRequests:  c.totalRequests,
		ErrorRate:      errorRate,
		RequestsPerMin: reqPerMin,
		LatencyP50:     p50,
		LatencyP95:     p95,
		LatencyP99:     p99,
		TopEndpoints:   topEndpoints,
		StatusCodes:    statusCodes,
		EventCounts:    eventCounts,
		EventsDropped:  c.eventsDropped,
		WebhookStats:   webhookStats,
		WSConnections:  atomic.LoadInt64(&c.wsConnections),
		System: SystemMetrics{
			Goroutines:   runtime.NumGoroutine(),
			MemAllocMB:   float64(memStats.Alloc) / 1024 / 1024,
			MemSysMB:     float64(memStats.Sys) / 1024 / 1024,
			HeapObjectsK: float64(memStats.HeapObjects) / 1000,
			GCPauseMs:    lastGCPause,
			NumGC:        memStats.NumGC,
		},
	}
}

// GetRequestLogs returns the most recent request log entries, up to limit.
func (c *Collector) GetRequestLogs(limit int) []RequestLog {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if limit <= 0 || limit > c.latencyLen {
		limit = c.latencyLen
	}

	result := make([]RequestLog, 0, limit)
	// Read from ring buffer in reverse chronological order
	idx := (c.latencyIdx - 1 + maxRequestLogs) % maxRequestLogs
	for i := 0; i < limit; i++ {
		result = append(result, c.latencies[idx])
		idx = (idx - 1 + maxRequestLogs) % maxRequestLogs
	}

	return result
}

// GetLogs returns the most recent log entries, optionally filtered by level.
func (c *Collector) GetLogs(limit int, level string) []LogEntry {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if limit <= 0 {
		limit = c.logLen
	}

	result := make([]LogEntry, 0, limit)
	idx := (c.logIdx - 1 + maxLogEntries) % maxLogEntries
	scanned := 0
	for scanned < c.logLen && len(result) < limit {
		entry := c.logs[idx]
		if level == "" || entry.Level == level {
			result = append(result, entry)
		}
		idx = (idx - 1 + maxLogEntries) % maxLogEntries
		scanned++
	}

	return result
}

// GetHealthChecks performs health checks against dependent services.
func (c *Collector) GetHealthChecks(ctx context.Context, pool *pgxpool.Pool, inferenceURL string) []HealthStatus {
	checks := make([]HealthStatus, 0, 3)

	// API self-check
	checks = append(checks, HealthStatus{
		Service:   "api",
		Status:    "healthy",
		LatencyMs: 0,
		CheckedAt: time.Now(),
	})

	// Database health check
	dbCheck := HealthStatus{
		Service:   "database",
		CheckedAt: time.Now(),
	}
	start := time.Now()
	if err := pool.Ping(ctx); err != nil {
		dbCheck.Status = "down"
		dbCheck.Details = err.Error()
	} else {
		dbCheck.Status = "healthy"
	}
	dbCheck.LatencyMs = time.Since(start).Milliseconds()
	checks = append(checks, dbCheck)

	// Inference service health check
	infCheck := HealthStatus{
		Service:   "inference",
		CheckedAt: time.Now(),
	}
	start = time.Now()
	reqCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, inferenceURL+"/models/health", nil)
	if err != nil {
		infCheck.Status = "down"
		infCheck.Details = err.Error()
	} else {
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			infCheck.Status = "down"
			infCheck.Details = err.Error()
		} else {
			resp.Body.Close()
			if resp.StatusCode >= 200 && resp.StatusCode < 300 {
				infCheck.Status = "healthy"
			} else {
				infCheck.Status = "degraded"
				infCheck.Details = fmt.Sprintf("status %d", resp.StatusCode)
			}
		}
	}
	infCheck.LatencyMs = time.Since(start).Milliseconds()
	checks = append(checks, infCheck)

	return checks
}

// computePercentiles returns p50, p95, p99 latencies from the ring buffer.
// Must be called with c.mu held.
func (c *Collector) computePercentiles() (p50, p95, p99 int64) {
	if c.latencyLen == 0 {
		return 0, 0, 0
	}

	latencies := make([]int64, c.latencyLen)
	for i := 0; i < c.latencyLen; i++ {
		latencies[i] = c.latencies[i].LatencyMs
	}
	sort.Slice(latencies, func(i, j int) bool { return latencies[i] < latencies[j] })

	p50 = latencies[percentileIndex(c.latencyLen, 50)]
	p95 = latencies[percentileIndex(c.latencyLen, 95)]
	p99 = latencies[percentileIndex(c.latencyLen, 99)]
	return
}

func percentileIndex(n, pct int) int {
	idx := (n*pct + 99) / 100 - 1
	if idx < 0 {
		idx = 0
	}
	if idx >= n {
		idx = n - 1
	}
	return idx
}

// topEndpoints returns the top N endpoints by request count.
// Must be called with c.mu held.
func (c *Collector) topEndpoints(n int) []EndpointStats {
	type pathEntry struct {
		path string
		pm   *PathMetrics
	}

	entries := make([]pathEntry, 0, len(c.requestsByPath))
	for p, pm := range c.requestsByPath {
		entries = append(entries, pathEntry{path: p, pm: pm})
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].pm.Count > entries[j].pm.Count
	})

	if n > len(entries) {
		n = len(entries)
	}

	result := make([]EndpointStats, n)
	for i := 0; i < n; i++ {
		e := entries[i]
		var avgLatency float64
		if e.pm.Count > 0 {
			avgLatency = float64(e.pm.TotalLatency) / float64(e.pm.Count)
		}
		result[i] = EndpointStats{
			Path:         e.path,
			Count:        e.pm.Count,
			ErrorCount:   e.pm.ErrorCount,
			AvgLatencyMs: avgLatency,
			MaxLatencyMs: e.pm.MaxLatency,
		}
	}

	return result
}

func formatDuration(d time.Duration) string {
	days := int(d.Hours()) / 24
	hours := int(d.Hours()) % 24
	minutes := int(d.Minutes()) % 60
	seconds := int(d.Seconds()) % 60

	if days > 0 {
		return fmt.Sprintf("%dd %dh %dm %ds", days, hours, minutes, seconds)
	}
	if hours > 0 {
		return fmt.Sprintf("%dh %dm %ds", hours, minutes, seconds)
	}
	if minutes > 0 {
		return fmt.Sprintf("%dm %ds", minutes, seconds)
	}
	return fmt.Sprintf("%ds", seconds)
}
