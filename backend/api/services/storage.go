package services

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
)

// StorageService handles file storage operations.
type StorageService struct {
	bucket string
	devMode bool
	localDir string
}

// NewStorageService creates a storage service.
func NewStorageService(bucket string) *StorageService {
	devMode := bucket == "" || bucket == "dev-bucket"
	localDir := "/tmp/warehouse-uploads"
	if devMode {
		os.MkdirAll(localDir, 0o755)
	}
	return &StorageService{
		bucket:   bucket,
		devMode:  devMode,
		localDir: localDir,
	}
}

// GenerateUploadURL generates a presigned upload URL or local path.
func (s *StorageService) GenerateUploadURL(prefix, filename string) (string, string, error) {
	objectKey := fmt.Sprintf("%s/%s/%s", prefix, time.Now().Format("2006/01/02"), filename)

	if s.devMode {
		dir := filepath.Join(s.localDir, prefix, time.Now().Format("2006/01/02"))
		os.MkdirAll(dir, 0o755)
		localPath := filepath.Join(dir, filename)
		return localPath, objectKey, nil
	}

	// In production, generate a signed URL using GCS client
	// For now return a placeholder
	url := fmt.Sprintf("https://storage.googleapis.com/%s/%s?X-Goog-Signature=placeholder&X-Goog-Expires=%d",
		s.bucket, objectKey, 3600)
	return url, objectKey, nil
}

// GenerateDownloadURL generates a presigned download URL.
func (s *StorageService) GenerateDownloadURL(objectKey string) (string, error) {
	if s.devMode {
		localPath := filepath.Join(s.localDir, objectKey)
		return localPath, nil
	}

	url := fmt.Sprintf("https://storage.googleapis.com/%s/%s?X-Goog-Signature=placeholder&X-Goog-Expires=%d",
		s.bucket, objectKey, 3600)
	return url, nil
}

// DeleteObject deletes a storage object.
func (s *StorageService) DeleteObject(objectKey string) error {
	if s.devMode {
		localPath := filepath.Join(s.localDir, objectKey)
		return os.Remove(localPath)
	}

	// In production, use GCS client to delete
	return nil
}

// GenerateUniqueFilename generates a unique filename preserving extension.
func GenerateUniqueFilename(originalName string) string {
	ext := filepath.Ext(originalName)
	return uuid.New().String() + ext
}
