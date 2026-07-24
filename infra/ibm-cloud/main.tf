resource "random_id" "global_suffix" {
  byte_length = 3
}

resource "random_password" "postgres_admin" {
  length           = 32
  special          = true
  override_special = "!#$%&*+-.:=?@^_~"
}

resource "random_password" "postgres_runtime" {
  length           = 32
  special          = true
  override_special = "!#$%&*+-.:=?@^_~"
}

resource "random_password" "session_secret" {
  length  = 64
  special = false
}

locals {
  suffix                = random_id.global_suffix.hex
  registry_namespace    = substr("${var.name_prefix}-${local.suffix}", 0, 30)
  documents_bucket_name = substr("${var.name_prefix}-documents-${local.suffix}", 0, 63)
  private_registry_host = "private.${var.container_registry_host}"
  postgres_runtime_user = "watson_cdi_app"
  postgres_runtime_url = format(
    "postgresql://%s:%s@%s:%s/%s",
    urlencode(local.postgres_runtime_user),
    urlencode(random_password.postgres_runtime.result),
    data.ibm_database_connection.postgresql.postgres[0].hosts[0].hostname,
    data.ibm_database_connection.postgresql.postgres[0].hosts[0].port,
    data.ibm_database_connection.postgresql.postgres[0].database,
  )

  canonical_base_url = trimsuffix(var.app_base_url, "/")
  appid_redirect_urls = distinct(compact(concat(
    ["${ibm_code_engine_app.app.endpoint}/auth/callback"],
    var.app_base_url == "" ? [] : ["${local.canonical_base_url}/auth/callback"],
    var.additional_appid_redirect_urls,
  )))
}

resource "ibm_resource_group" "watson_cdi" {
  name = var.resource_group_name
  tags = var.tags
}

resource "ibm_code_engine_project" "pilot" {
  name              = var.code_engine_project_name
  resource_group_id = ibm_resource_group.watson_cdi.id
}

resource "ibm_cr_namespace" "watson_cdi" {
  name              = local.registry_namespace
  resource_group_id = ibm_resource_group.watson_cdi.id
  tags              = var.tags
}

resource "ibm_database" "postgresql" {
  name              = var.postgres_name
  resource_group_id = ibm_resource_group.watson_cdi.id
  service           = "databases-for-postgresql"
  plan              = "standard"
  location          = var.region
  service_endpoints = var.postgres_service_endpoints
  adminpassword     = random_password.postgres_admin.result
  tags              = var.tags

  group {
    group_id = "member"

    host_flavor {
      id = "multitenant"
    }

    memory {
      allocation_mb = var.postgres_memory_mb_per_member
    }

    disk {
      allocation_mb = var.postgres_disk_mb_per_member
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

data "ibm_database_connection" "postgresql" {
  deployment_id = ibm_database.postgresql.id
  user_type     = "database"
  user_id       = "admin"
  endpoint_type = contains(["public", "public-and-private"], var.postgres_service_endpoints) ? "public" : "private"
}

resource "ibm_resource_instance" "cos" {
  name              = "${var.name_prefix}-cos"
  resource_group_id = ibm_resource_group.watson_cdi.id
  service           = "cloud-object-storage"
  plan              = var.cos_plan
  location          = "global"
  tags              = var.tags
}

resource "ibm_cos_bucket" "documents" {
  bucket_name          = local.documents_bucket_name
  resource_instance_id = ibm_resource_instance.cos.id
  region_location      = var.region
  storage_class        = var.cos_storage_class
  force_delete         = false
}

resource "ibm_iam_service_id" "runtime" {
  name        = "${var.name_prefix}-runtime"
  description = "Runtime identity restricted to Watson CDI document objects."
  tags        = var.tags
}

resource "ibm_iam_service_policy" "runtime_cos" {
  iam_id      = ibm_iam_service_id.runtime.iam_id
  roles       = ["Writer"]
  description = "Read and write Watson CDI private document objects."

  resources {
    service              = "cloud-object-storage"
    resource_instance_id = ibm_resource_instance.cos.guid
  }
}

resource "ibm_iam_service_api_key" "runtime" {
  name           = "${var.name_prefix}-runtime-key"
  description    = "Runtime credential injected only into the Code Engine secret."
  iam_service_id = ibm_iam_service_id.runtime.iam_id
  store_value    = true

  depends_on = [
    ibm_iam_service_policy.runtime_cos,
  ]
}

resource "ibm_resource_instance" "appid" {
  name              = "${var.name_prefix}-appid"
  resource_group_id = ibm_resource_group.watson_cdi.id
  service           = "appid"
  plan              = var.appid_plan
  location          = var.region
  tags              = var.tags
}

resource "ibm_appid_idp_cloud_directory" "cloud_directory" {
  tenant_id                           = ibm_resource_instance.appid.guid
  is_active                           = true
  identity_confirm_methods            = ["email"]
  identity_field                      = "email"
  self_service_enabled                = true
  signup_enabled                      = true
  welcome_enabled                     = true
  reset_password_enabled              = true
  reset_password_notification_enabled = true
}

resource "ibm_appid_application" "web" {
  tenant_id = ibm_resource_instance.appid.guid
  name      = "${var.name_prefix}-web"
  type      = "regularwebapp"

  depends_on = [ibm_appid_idp_cloud_directory.cloud_directory]
}

resource "ibm_code_engine_config_map" "application" {
  project_id = ibm_code_engine_project.pilot.project_id
  name       = "${var.name_prefix}-config"
  data = merge({
    NODE_ENV                    = "production"
    PLATFORM_TARGET             = "ibm"
    WATSON_CDI_RUNTIME          = "ibm"
    PORT                        = "8080"
    IBM_COS_BUCKET              = ibm_cos_bucket.documents.bucket_name
    IBM_COS_ENDPOINT            = ibm_cos_bucket.documents.s3_endpoint_direct
    IBM_COS_SERVICE_INSTANCE_ID = ibm_resource_instance.cos.crn
    WATSONX_URL                 = var.watsonx_url
    WATSONX_PROJECT_ID          = var.watsonx_project_id
    WATSONX_MODEL_ID            = var.watsonx_model_id
    }, var.app_base_url == "" ? {} : {
    APP_BASE_URL = local.canonical_base_url
  })
}

resource "ibm_code_engine_secret" "runtime" {
  project_id = ibm_code_engine_project.pilot.project_id
  name       = "${var.name_prefix}-runtime"
  format     = "generic"
  data = {
    DATABASE_URL            = local.postgres_runtime_url
    DATABASE_CA_CERT_BASE64 = data.ibm_database_connection.postgresql.postgres[0].certificate[0].certificate_base64
    IBM_COS_API_KEY         = ibm_iam_service_api_key.runtime.apikey
    APPID_DISCOVERY_URL     = ibm_appid_application.web.discovery_endpoint
    APPID_CLIENT_ID         = ibm_appid_application.web.client_id
    APPID_CLIENT_SECRET     = ibm_appid_application.web.secret
    SESSION_SECRET          = random_password.session_secret.result
    WATSONX_API_KEY         = var.watsonx_api_key
  }
}

resource "ibm_code_engine_secret" "migration" {
  project_id = ibm_code_engine_project.pilot.project_id
  name       = "${var.name_prefix}-migration"
  format     = "generic"
  data = {
    DATABASE_URL              = data.ibm_database_connection.postgresql.postgres[0].composed[0]
    DATABASE_CA_CERT_BASE64   = data.ibm_database_connection.postgresql.postgres[0].certificate[0].certificate_base64
    DATABASE_RUNTIME_USER     = local.postgres_runtime_user
    DATABASE_RUNTIME_PASSWORD = random_password.postgres_runtime.result
  }
}

resource "ibm_code_engine_secret" "cos_service_access" {
  project_id = ibm_code_engine_project.pilot.project_id
  name       = "${var.name_prefix}-cos-binding"
  format     = "service_access"

  service_access {
    service_instance {
      id = ibm_resource_instance.cos.guid
    }
    serviceid {
      id = ibm_iam_service_id.runtime.id
    }
    role {
      crn = "crn:v1:bluemix:public:iam::::serviceRole:Writer"
    }
  }

  depends_on = [ibm_iam_service_policy.runtime_cos]
}

resource "ibm_code_engine_app" "app" {
  project_id              = ibm_code_engine_project.pilot.project_id
  name                    = var.code_engine_app_name
  image_reference         = var.bootstrap_image_reference
  image_port              = 8080
  run_service_account     = "none"
  managed_domain_mappings = "local_public"
  scale_cpu_limit         = var.app_cpu
  scale_memory_limit      = var.app_memory
  scale_min_instances     = var.app_min_instances
  scale_max_instances     = var.app_max_instances
  scale_request_timeout   = 300

  run_env_variables {
    type      = "config_map_full_reference"
    reference = ibm_code_engine_config_map.application.name
  }

  run_env_variables {
    type      = "secret_full_reference"
    reference = ibm_code_engine_secret.runtime.name
  }

  probe_liveness {
    type              = "http"
    path              = var.bootstrap_mode ? "/" : "/api/health/live"
    port              = 8080
    initial_delay     = 5
    interval          = 30
    timeout           = 5
    failure_threshold = 3
  }

  probe_readiness {
    type              = "http"
    path              = var.bootstrap_mode ? "/" : "/api/health/ready"
    port              = 8080
    initial_delay     = 5
    interval          = 10
    timeout           = 5
    failure_threshold = 3
  }

  lifecycle {
    # The deployment workflow owns the immutable digest and registry secret.
    # Terraform owns the application envelope, probes, scaling, and config.
    ignore_changes = [image_reference, image_secret]
  }
}

resource "ibm_code_engine_job" "migrate" {
  project_id               = ibm_code_engine_project.pilot.project_id
  name                     = var.code_engine_migration_job_name
  image_reference          = var.bootstrap_image_reference
  run_service_account      = "none"
  run_commands             = var.migration_commands
  run_arguments            = var.migration_arguments
  scale_cpu_limit          = "1"
  scale_memory_limit       = "2G"
  scale_max_execution_time = 900
  scale_retry_limit        = 1

  run_env_variables {
    type      = "config_map_full_reference"
    reference = ibm_code_engine_config_map.application.name
  }

  run_env_variables {
    type      = "secret_full_reference"
    reference = ibm_code_engine_secret.migration.name
  }

  lifecycle {
    # The deployment workflow keeps the migration job on the same digest as the
    # application. A later infrastructure apply must not restore the hello image.
    ignore_changes = [image_reference, image_secret]
  }
}

resource "ibm_code_engine_binding" "app_cos" {
  project_id  = ibm_code_engine_project.pilot.project_id
  prefix      = "COS"
  secret_name = ibm_code_engine_secret.cos_service_access.name

  component {
    name          = ibm_code_engine_app.app.name
    resource_type = "app_v2"
  }
}

resource "ibm_appid_redirect_urls" "application" {
  tenant_id = ibm_resource_instance.appid.guid
  urls      = local.appid_redirect_urls

  depends_on = [ibm_code_engine_app.app]
}
