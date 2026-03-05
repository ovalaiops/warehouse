terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Cloud SQL - PostgreSQL
resource "google_sql_database_instance" "main" {
  name             = "warehouse-intel-db"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = var.db_tier
    ip_configuration {
      authorized_networks {
        name  = "allow-all"
        value = "0.0.0.0/0"
      }
    }
    backup_configuration {
      enabled = true
    }
  }

  deletion_protection = false
}

resource "google_sql_database" "warehouse" {
  name     = "warehouse"
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "warehouse" {
  name     = "warehouse"
  instance = google_sql_database_instance.main.name
  password = var.db_password
}

# Cloud Storage
resource "google_storage_bucket" "media" {
  name          = "${var.project_id}-media"
  location      = var.region
  force_destroy = true

  uniform_bucket_level_access = true

  cors {
    origin          = ["*"]
    method          = ["GET", "PUT", "POST"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }
}

# Cloud Run - Go API
resource "google_cloud_run_v2_service" "api" {
  name     = "warehouse-api"
  location = var.region

  template {
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/warehouse/api:latest"

      env {
        name  = "PORT"
        value = "8080"
      }
      env {
        name  = "DATABASE_URL"
        value = "postgres://warehouse:${var.db_password}@${google_sql_database_instance.main.public_ip_address}:5432/warehouse"
      }
      env {
        name  = "FIREBASE_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "INFERENCE_URL"
        value = "http://${google_compute_instance.gpu.network_interface[0].access_config[0].nat_ip}:8090"
      }
      env {
        name  = "CLOUD_STORAGE_BUCKET"
        value = google_storage_bucket.media.name
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }
  }
}

# Make API publicly accessible
resource "google_cloud_run_v2_service_iam_member" "api_public" {
  name     = google_cloud_run_v2_service.api.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# GCE GPU Instance - Inference Server
resource "google_compute_instance" "gpu" {
  name         = "warehouse-inference"
  machine_type = var.gpu_machine_type
  zone         = "${var.region}-a"

  boot_disk {
    initialize_params {
      image = "projects/ml-images/global/images/family/common-gpu"
      size  = 200
    }
  }

  guest_accelerator {
    type  = var.gpu_type
    count = 1
  }

  scheduling {
    on_host_maintenance = "TERMINATE"
  }

  network_interface {
    network = "default"
    access_config {}
  }

  metadata_startup_script = <<-EOF
    #!/bin/bash
    apt-get update && apt-get install -y docker.io nvidia-container-toolkit
    systemctl restart docker
    docker pull ${var.region}-docker.pkg.dev/${var.project_id}/warehouse/inference:latest
    docker run -d --gpus all -p 8090:8090 \
      -e DEMO_MODE=false \
      -e MODEL_2B_PATH=nvidia/Cosmos-Reason2-2B \
      -e MODEL_8B_PATH=nvidia/Cosmos-Reason2-8B \
      ${var.region}-docker.pkg.dev/${var.project_id}/warehouse/inference:latest
  EOF

  tags = ["inference-server"]
}

# Firewall rule for inference server
resource "google_compute_firewall" "inference" {
  name    = "allow-inference"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["8090"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["inference-server"]
}

# Artifact Registry
resource "google_artifact_registry_repository" "warehouse" {
  location      = var.region
  repository_id = "warehouse"
  format        = "DOCKER"
}
