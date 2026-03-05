package config

import "github.com/kelseyhightower/envconfig"

type Config struct {
	Port               string `envconfig:"PORT" default:"8080"`
	DatabaseURL        string `envconfig:"DATABASE_URL" required:"true"`
	FirebaseProjectID  string `envconfig:"FIREBASE_PROJECT_ID" required:"true"`
	InferenceURL       string `envconfig:"INFERENCE_URL" default:"http://localhost:8090"`
	CloudStorageBucket string `envconfig:"CLOUD_STORAGE_BUCKET" required:"true"`
	PubSubTopic        string `envconfig:"PUBSUB_TOPIC" default:"warehouse-events"`
}

func Load() (*Config, error) {
	var cfg Config
	err := envconfig.Process("", &cfg)
	return &cfg, err
}
