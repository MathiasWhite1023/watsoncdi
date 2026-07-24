variable "region" {
  description = "IBM Cloud region for regional resources."
  type        = string
  default     = "br-sao"

  validation {
    condition     = contains(["au-syd", "br-sao", "ca-tor", "eu-de", "eu-gb", "jp-osa", "jp-tok", "us-east", "us-south"], var.region)
    error_message = "region must be a region supported by IBM Cloud Code Engine."
  }
}

variable "resource_group_name" {
  description = "Resource group created for the Watson CDI pilot."
  type        = string
  default     = "watson-cdi"
}

variable "name_prefix" {
  description = "Prefix used for IBM Cloud resources."
  type        = string
  default     = "watson-cdi"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix must be 4-22 lowercase alphanumeric or hyphen characters and start with a letter."
  }
}

variable "tags" {
  description = "Tags applied to supported IBM Cloud resources."
  type        = list(string)
  default     = ["application:watson-cdi", "environment:pilot", "managed-by:terraform"]
}

variable "code_engine_project_name" {
  description = "Code Engine project name."
  type        = string
  default     = "watson-cdi-pilot"
}

variable "code_engine_app_name" {
  description = "Code Engine application name."
  type        = string
  default     = "watson-cdi-pilot"
}

variable "code_engine_migration_job_name" {
  description = "Code Engine job used for forward-only database migrations."
  type        = string
  default     = "watson-cdi-migrate"
}

variable "bootstrap_image_reference" {
  description = "Public image used only to bootstrap Code Engine before the first immutable Watson CDI image is published."
  type        = string
  default     = "icr.io/codeengine/helloworld"
}

variable "bootstrap_mode" {
  description = "Use root-path probes while the public hello image is running. Set false only after the first Watson CDI image has been deployed."
  type        = bool
  default     = true
}

variable "container_registry_host" {
  description = "Public IBM Container Registry host used by CI. Code Engine derives its private pull host by prefixing private."
  type        = string
  default     = "br.icr.io"

  validation {
    condition     = can(regex("^[a-z0-9.-]+\\.icr\\.io$", var.container_registry_host))
    error_message = "container_registry_host must be an IBM Container Registry host such as br.icr.io."
  }
}

variable "app_cpu" {
  description = "vCPU limit for each Code Engine application instance."
  type        = string
  default     = "1"
}

variable "app_memory" {
  description = "Memory limit for each Code Engine application instance."
  type        = string
  default     = "2G"
}

variable "app_min_instances" {
  description = "Minimum application instances; zero enables scale-to-zero."
  type        = number
  default     = 0
}

variable "app_max_instances" {
  description = "Maximum application instances for the pilot."
  type        = number
  default     = 2

  validation {
    condition     = var.app_max_instances >= 1 && var.app_max_instances <= 10
    error_message = "app_max_instances must be between 1 and 10."
  }
}

variable "postgres_name" {
  description = "IBM Databases for PostgreSQL instance name."
  type        = string
  default     = "watson-cdi-postgresql"
}

variable "postgres_memory_mb_per_member" {
  description = "Shared Compute memory allocation per PostgreSQL member."
  type        = number
  default     = 4096

  validation {
    condition     = var.postgres_memory_mb_per_member >= 4096
    error_message = "PostgreSQL requires at least 4096 MB of memory per member."
  }
}

variable "postgres_disk_mb_per_member" {
  description = "Disk allocation per PostgreSQL member. IBM Cloud storage cannot be scaled down."
  type        = number
  default     = 5120

  validation {
    condition     = var.postgres_disk_mb_per_member >= 5120
    error_message = "PostgreSQL requires at least 5120 MB of disk per member."
  }
}

variable "postgres_service_endpoints" {
  description = "PostgreSQL service endpoint visibility. The pilot defaults to TLS-protected public connectivity because Code Engine private routing is not assumed."
  type        = string
  default     = "public-and-private"

  validation {
    condition     = contains(["private", "public", "public-and-private"], var.postgres_service_endpoints)
    error_message = "postgres_service_endpoints must be private, public, or public-and-private."
  }
}

variable "cos_plan" {
  description = "Cloud Object Storage service plan. Standard avoids the one-Lite-instance-per-account constraint."
  type        = string
  default     = "standard"
}

variable "cos_storage_class" {
  description = "Storage class for the regional documents bucket."
  type        = string
  default     = "standard"

  validation {
    condition     = contains(["standard", "vault", "cold", "smart"], var.cos_storage_class)
    error_message = "cos_storage_class must be standard, vault, cold, or smart."
  }
}

variable "appid_plan" {
  description = "App ID plan. Lite includes the pilot allowance but is deleted after prolonged inactivity."
  type        = string
  default     = "lite"

  validation {
    condition     = contains(["lite", "graduated-tier"], var.appid_plan)
    error_message = "appid_plan must be lite or graduated-tier."
  }
}

variable "app_base_url" {
  description = "Canonical HTTPS origin without credentials, path, query, fragment, or trailing slash. Leave empty only for the first infrastructure bootstrap, then set it to the Code Engine application origin and apply again before testing authentication."
  type        = string
  default     = ""

  validation {
    condition     = var.app_base_url == "" || can(regex("^https://[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?(:[0-9]{1,5})?$", var.app_base_url))
    error_message = "app_base_url must be empty or an HTTPS origin without credentials, path, query, fragment, or trailing slash."
  }
}

variable "additional_appid_redirect_urls" {
  description = "Additional exact App ID redirect URLs, for example a future custom domain callback."
  type        = list(string)
  default     = []
}

variable "migration_commands" {
  description = "Container command for the forward-only migration job."
  type        = list(string)
  default     = ["node"]
}

variable "migration_arguments" {
  description = "Arguments for the forward-only migration job."
  type        = list(string)
  default     = ["db/postgres/deploy.mjs"]
}

variable "watsonx_url" {
  description = "Optional watsonx endpoint. This is configuration, not a credential."
  type        = string
  default     = ""
}

variable "watsonx_project_id" {
  description = "Optional watsonx project identifier."
  type        = string
  default     = ""
}

variable "watsonx_model_id" {
  description = "Optional watsonx model identifier."
  type        = string
  default     = ""
}

variable "watsonx_api_key" {
  description = "Optional watsonx API key. Supply only as a protected Schematics variable."
  type        = string
  default     = ""
  sensitive   = true
}
