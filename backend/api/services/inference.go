package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"time"
)

// InferenceService is an HTTP client for the Python inference server.
type InferenceService struct {
	baseURL    string
	httpClient *http.Client
}

// NewInferenceService creates a new inference service client.
func NewInferenceService(baseURL string) *InferenceService {
	return &InferenceService{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// InferenceRequest holds common fields for inference requests.
type InferenceRequest struct {
	ImageData []byte            `json:"-"`
	FileName  string            `json:"-"`
	Metadata  map[string]string `json:"metadata,omitempty"`
}

// InferenceResponse is a generic response from the inference server.
type InferenceResponse struct {
	Success    bool            `json:"success"`
	Model      string          `json:"model"`
	Detections json.RawMessage `json:"detections,omitempty"`
	Caption    string          `json:"caption,omitempty"`
	Labels     []string        `json:"labels,omitempty"`
	Confidence float64         `json:"confidence,omitempty"`
	Data       json.RawMessage `json:"data,omitempty"`
}

func (s *InferenceService) doInfer(ctx context.Context, endpoint string, req *InferenceRequest) (*InferenceResponse, error) {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	if req.ImageData != nil {
		part, err := writer.CreateFormFile("file", req.FileName)
		if err != nil {
			return nil, fmt.Errorf("create form file: %w", err)
		}
		if _, err := part.Write(req.ImageData); err != nil {
			return nil, fmt.Errorf("write file data: %w", err)
		}
	}

	for k, v := range req.Metadata {
		writer.WriteField(k, v)
	}
	writer.Close()

	url := fmt.Sprintf("%s%s", s.baseURL, endpoint)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, &body)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", writer.FormDataContentType())

	// Retry up to 2 times
	var resp *http.Response
	for attempt := 0; attempt < 3; attempt++ {
		resp, err = s.httpClient.Do(httpReq)
		if err == nil {
			break
		}
		if attempt < 2 {
			time.Sleep(time.Duration(attempt+1) * 500 * time.Millisecond)
		}
	}
	if err != nil {
		return nil, fmt.Errorf("inference request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("inference server returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result InferenceResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return &result, nil
}

func (s *InferenceService) InferSafety(ctx context.Context, req *InferenceRequest) (*InferenceResponse, error) {
	return s.doInfer(ctx, "/api/v1/infer/safety", req)
}

func (s *InferenceService) InferInventory(ctx context.Context, req *InferenceRequest) (*InferenceResponse, error) {
	return s.doInfer(ctx, "/api/v1/infer/inventory", req)
}

func (s *InferenceService) InferProduct(ctx context.Context, req *InferenceRequest) (*InferenceResponse, error) {
	return s.doInfer(ctx, "/api/v1/infer/product", req)
}

func (s *InferenceService) InferFleet(ctx context.Context, req *InferenceRequest) (*InferenceResponse, error) {
	return s.doInfer(ctx, "/api/v1/infer/fleet", req)
}

func (s *InferenceService) InferCaption(ctx context.Context, req *InferenceRequest) (*InferenceResponse, error) {
	return s.doInfer(ctx, "/api/v1/infer/caption", req)
}

func (s *InferenceService) InferSpatial(ctx context.Context, req *InferenceRequest) (*InferenceResponse, error) {
	return s.doInfer(ctx, "/api/v1/infer/spatial", req)
}

func (s *InferenceService) InferQuality(ctx context.Context, req *InferenceRequest) (*InferenceResponse, error) {
	return s.doInfer(ctx, "/api/v1/infer/quality", req)
}

func (s *InferenceService) InferWeight(ctx context.Context, req *InferenceRequest) (*InferenceResponse, error) {
	return s.doInfer(ctx, "/api/v1/infer/weight", req)
}
