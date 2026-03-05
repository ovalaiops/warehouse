variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "warehouse-intel"
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "db_tier" {
  description = "Cloud SQL instance tier"
  type        = string
  default     = "db-f1-micro" # Use db-custom-4-16384 for production
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "gpu_machine_type" {
  description = "GPU instance machine type"
  type        = string
  default     = "n1-standard-8" # Use a2-highgpu-1g for H100
}

variable "gpu_type" {
  description = "GPU accelerator type"
  type        = string
  default     = "nvidia-tesla-t4" # Use nvidia-l4 or nvidia-a100-80gb for production
}
