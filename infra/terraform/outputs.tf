output "api_url" {
  value = google_cloud_run_v2_service.api.uri
}

output "db_ip" {
  value = google_sql_database_instance.main.public_ip_address
}

output "inference_ip" {
  value = google_compute_instance.gpu.network_interface[0].access_config[0].nat_ip
}

output "storage_bucket" {
  value = google_storage_bucket.media.name
}

output "artifact_registry" {
  value = google_artifact_registry_repository.warehouse.name
}
