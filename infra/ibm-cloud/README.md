# Watson CDI on IBM Cloud

This directory defines the V6 pilot infrastructure in `br-sao`. It does not
replace or modify the OpenAI Sites deployment.

## Architecture

The stack creates:

- resource group `watson-cdi`;
- a Code Engine project, public application, migration job, health probes,
  runtime config map, runtime secret, and service bindings;
- the smallest supported Databases for PostgreSQL Shared Compute allocation;
- a private regional Cloud Object Storage bucket with versioning disabled in
  the pilot so an approved delete removes the stored object completely;
- App ID Lite with open Cloud Directory sign-up, email confirmation, password
  reset, a regular web application, and exact redirect URLs;
- a private IBM Container Registry namespace;
- a runtime service ID restricted to the dedicated COS instance;
- separate Code Engine secrets for the restricted PostgreSQL runtime role and
  the migration-only administrator.

The application scales from zero to two instances at 1 vCPU and 2 GB each.
PostgreSQL has two managed members; the Terraform allocation is specified per
member. In `br-sao`, CI pushes through `br.icr.io` and Code Engine pulls through
`private.br.icr.io`. The application and migration job explicitly disable a
Code Engine run service account. COS access is injected only into the
application; the migration job receives database migration credentials and no
document-store binding.

## Safety and cost gate

Do not run `terraform apply` until the IBM Cloud catalog estimate has been
reviewed and explicitly approved. The PostgreSQL Standard plan is the main
fixed-cost resource. The review must also include COS, Code Engine, Container
Registry storage/transfer, and App ID usage and plan limits. App ID Lite is free
within its published allowance but can be deleted after prolonged inactivity.

No secret belongs in Git. Terraform generates the database passwords and
session secret. The application receives a restricted PostgreSQL login; only
the migration job receives the generated administrator connection. App ID,
PostgreSQL, and COS credentials are written only to Code Engine secrets and the
encrypted Schematics state. Outputs contain no credentials, connection strings,
tokens, or certificates.

`prevent_destroy` protects PostgreSQL. An intentional database removal requires
a reviewed code change before Terraform can destroy it.

Before staging, run `npm audit --omit=dev` in an approved CI environment and
record the disposition of every high or critical production-dependency
advisory. The local container install reported advisory counts, but the
registry-backed detail was intentionally not queried during the offline
validation.

## State with IBM Cloud Schematics

There is deliberately no local or remote `backend` block. IBM Cloud Schematics
owns and encrypts the state for workspaces that run this template.

1. Push this branch to GitHub.
2. In IBM Cloud, create a Schematics workspace in `br-sao`.
3. Select the repository and branch, and set the template folder to
   `infra/ibm-cloud`.
4. Use a Terraform version compatible with `>= 1.10, < 2.0`.
5. Add `region=br-sao` and any non-secret overrides.
6. Add `watsonx_api_key` only as a **sensitive** workspace variable if watsonx
   is enabled.
7. Run **Generate plan**. Export the plan summary and create a catalog cost
   estimate for every item shown by the `cost_review_required` output.
8. Request explicit approval before running **Apply plan**.

Schematics must be the only writer of this state after the workspace is
created. Do not alternate between local state and Schematics.

## Local validation (no provisioning)

IBM Cloud credentials are not required for formatting and static validation:

```sh
cd infra/ibm-cloud
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
```

Copy `terraform.tfvars.example` to the ignored `terraform.tfvars` only when a
local plan is intentionally required. Authenticate through `IC_API_KEY` or an
IBM Cloud trusted profile; never put an API key in a tfvars file.

## First provisioning

The Terraform application and migration job initially use IBM's public
`icr.io/codeengine/helloworld` image so that the infrastructure can be created
before the application image exists. The deployment workflow replaces both
references with the same immutable image digest.

Use this exact order. Do not deploy the Watson CDI image between the first and
second infrastructure applies:

1. Keep `bootstrap_mode=true` and `app_base_url=""`. Generate the Schematics
   plan, review the full catalog estimate, obtain explicit approval, and only
   then run the first apply.
2. Record `code_engine_application_url`, `container_registry_namespace`, and
   `code_engine_project_id`.
3. Copy the exact `code_engine_application_url` output into the Schematics
   `app_base_url` variable. It must be only an HTTPS origin: no credentials,
   path, query, fragment, or trailing slash. Generate, review, and run the
   second apply while `bootstrap_mode` remains `true`.
4. Configure GitHub repository variables:
   `IBM_REGION=br-sao`, `IBM_RESOURCE_GROUP=watson-cdi`,
   `IBM_CODE_ENGINE_PROJECT=watson-cdi-pilot`,
   `IBM_CODE_ENGINE_APP=watson-cdi-pilot`,
   `IBM_CODE_ENGINE_MIGRATION_JOB=watson-cdi-migrate`, and
   `IBM_CR_NAMESPACE=<output>`, `IBM_CR_HOST=br.icr.io`.
5. Configure two GitHub Environment secrets, never personal keys:
   - `IBM_CLOUD_API_KEY`: deployment-only service ID allowed to update the
     Code Engine app/job and push to this Container Registry namespace;
   - `IBM_CR_PULL_API_KEY`: separate service ID with read-only access to this
     Container Registry namespace. Code Engine stores this key only in its
     registry access secret.
6. Create GitHub Environments `ibm-cloud-staging` and
   `ibm-cloud-production`. Add required reviewers to both.
7. Run the manual IBM Cloud deployment workflow from the desired branch or
   commit. The workflow runs the migration job, deploys the application, and
   requires both health probes to pass. Production accepts tags only.
8. Only after that smoke test succeeds, set `bootstrap_mode=false`, generate and
   review a third plan, and apply it. Code Engine then probes
   `/api/health/live` and `/api/health/ready`.

The second apply injects `APP_BASE_URL` and keeps
`<code-engine-origin>/auth/callback` registered in App ID before the real
application is exposed. Terraform deliberately ignores subsequent
`image_reference` and `image_secret` drift because the deployment workflow owns
the immutable image digest and registry credential. When a custom domain is
added later, replace `app_base_url` with its HTTPS origin and repeat a reviewed
plan/apply before enabling that callback.

## Deployment runner and least privilege

The deployment job deliberately does not pipe a remote installer into a shell.
It targets a dedicated, preferably ephemeral, self-hosted GitHub runner with the
labels `self-hosted`, `linux`, `x64`, and `watson-cdi-ibm-cloud`. Build that
runner image through a separately reviewed supply-chain process and preinstall:

- IBM Cloud CLI `2.46.0`;
- Code Engine CLI plug-in `1.62.7`;
- Container Registry CLI plug-in `1.3.22`;
- Docker with Buildx, `jq`, and `curl`.

The workflow verifies those exact versions before authentication and stops on
any mismatch. Upgrade the runner image and the version constants in the
workflow in the same reviewed pull request. Do not replace this check with
`curl ... | sh`, and do not use an unpinned runner image.

Create both GitHub secrets from dedicated service IDs:

- the deployment identity needs only the Code Engine permissions required to
  update this project app/job and its registry access secret, plus Container
  Registry write access limited to the Watson CDI namespace and the minimum
  resource-group visibility required to target it;
- the pull identity needs only Container Registry read access limited to the
  Watson CDI namespace.

Do not grant either identity account Administrator or broad resource-management
roles. Keep the secrets in the protected GitHub Environments, require reviewers,
use an ephemeral runner where possible, and rotate both keys after runner or
workflow compromise. The secrets are scoped only to the authentication step;
the final workflow step logs out of IBM Cloud and the registry even after a
failure.

## Deployment order and rollback

The workflow builds and pushes `watson-cdi:<git-sha>`, updates and runs the
forward-only migration job, seeds only the idempotent synthetic public demo,
grants the minimum table and sequence privileges to the application role, then
updates the application. It never runs Terraform.

To roll back application code, manually dispatch the workflow at a previously
validated tag or commit. This deploys the prior immutable image while preserving
PostgreSQL and COS. Database migrations must remain backward compatible and are
never reversed destructively.

The OpenAI Sites deployment remains the production fallback throughout the IBM
Cloud pilot.
