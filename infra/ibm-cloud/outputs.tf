output "region" {
  description = "IBM Cloud region used by the pilot."
  value       = var.region
}

output "resource_group_name" {
  description = "Resource group containing the pilot."
  value       = ibm_resource_group.watson_cdi.name
}

output "code_engine_project_id" {
  description = "Code Engine project identifier."
  value       = ibm_code_engine_project.pilot.project_id
}

output "code_engine_project_name" {
  description = "Code Engine project name."
  value       = ibm_code_engine_project.pilot.name
}

output "code_engine_application_name" {
  description = "Code Engine application name."
  value       = ibm_code_engine_app.app.name
}

output "code_engine_application_url" {
  description = "Public pilot URL assigned by Code Engine."
  value       = ibm_code_engine_app.app.endpoint
}

output "code_engine_migration_job_name" {
  description = "Forward-only migration job name."
  value       = ibm_code_engine_job.migrate.name
}

output "container_registry_namespace" {
  description = "Container Registry namespace for immutable application images."
  value       = ibm_cr_namespace.watson_cdi.name
}

output "container_image_repository" {
  description = "Repository prefix used by the deployment workflow."
  value       = "${local.private_registry_host}/${ibm_cr_namespace.watson_cdi.name}/watson-cdi"
}

output "postgres_instance_name" {
  description = "Managed PostgreSQL instance name."
  value       = ibm_database.postgresql.name
}

output "documents_bucket_name" {
  description = "Private regional COS bucket name."
  value       = ibm_cos_bucket.documents.bucket_name
}

output "appid_instance_name" {
  description = "App ID service instance name."
  value       = ibm_resource_instance.appid.name
}

output "appid_redirect_urls" {
  description = "Redirect URLs registered with App ID."
  value       = local.appid_redirect_urls
}

output "cost_review_required" {
  description = "Resources that require an IBM Cloud catalog estimate before apply."
  value = [
    "IBM Databases for PostgreSQL standard Shared Compute",
    "IBM Cloud Object Storage ${var.cos_plan} usage",
    "Code Engine usage above the monthly free allowance",
    "IBM Container Registry storage and outbound transfer above account allowances",
    "IBM App ID usage and limits for the ${var.appid_plan} plan",
  ]
}
