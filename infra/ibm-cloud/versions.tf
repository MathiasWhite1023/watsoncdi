terraform {
  required_version = ">= 1.10.0, < 2.0.0"

  required_providers {
    ibm = {
      source  = "IBM-Cloud/ibm"
      version = "2.4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.7"
    }
  }
}

