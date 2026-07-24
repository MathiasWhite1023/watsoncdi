import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const [route, documents, appId, session, terraform, deploy, dockerignore] =
  await Promise.all([
    read("app/api/discoveries/route.ts"),
    read("app/api/accounts/[id]/documents/route.ts"),
    read("lib/auth/app-id.ts"),
    read("lib/auth/session.ts"),
    read("infra/ibm-cloud/main.tf"),
    read(".github/workflows/ibm-cloud-deploy.yml"),
    read(".dockerignore"),
  ]);

test("server-generated graph IDs cannot overwrite another tenant's records", () => {
  assert.match(route, /savedId = String\(existing\?\.id \|\| `rel-\$\{crypto\.randomUUID\(\)\}`\)/);
  assert.match(route, /requestedStakeholderId && !existing/);
  assert.match(route, /requestedStakeholderId \|\| `stk-\$\{crypto\.randomUUID\(\)\}`/);
  assert.match(
    route,
    /SELECT id FROM stakeholders WHERE id = \? AND discovery_id = \?/,
  );
  assert.match(
    route,
    /DELETE FROM account_relationships WHERE id = \? AND discovery_id = \?/,
  );
});

test("open registration has bounded account and document consumption", () => {
  assert.match(route, /limit of 25 accounts/);
  assert.match(route, /ACCOUNT_CREATION_RATE_LIMITED/);
  assert.match(documents, /maxDocumentsPerUser = 100/);
  assert.match(documents, /maxStoredBytesPerUser = 250 \* 1024 \* 1024/);
  assert.match(documents, /DOCUMENT_UPLOAD_RATE_LIMITED/);
  assert.match(documents, /maxMultipartBytes/);
  assert.match(documents, /signatureMatches\(extension, original\)/);
  assert.match(documents, /DOCUMENT_ALREADY_EXISTS/);
});

test("App ID authentication binds verified identities to opaque sessions", () => {
  assert.match(appId, /code_challenge_method/);
  assert.match(appId, /nonce/);
  assert.match(appId, /state/);
  assert.match(appId, /email_verified/);
  assert.match(session, /createHash\("sha256"\)/);
  assert.match(appId, /httpOnly:\s*true/);
  assert.match(appId, /sameSite:\s*"lax"/);
  assert.match(appId, /secure:\s*process\.env\.NODE_ENV === "production"/);
  assert.doesNotMatch(session, /expires_at > CURRENT_TIMESTAMP/);
});

test("migration jobs have no COS authority and deployment tooling is fixed", () => {
  assert.match(terraform, /IBM_COS_SERVICE_INSTANCE_ID\s+=\s+ibm_resource_instance\.cos\.crn/);
  assert.doesNotMatch(terraform, /ibm_code_engine_binding[^}]+migration_job/s);
  assert.match(terraform, /run_service_account\s+=\s+"none"/);
  assert.doesNotMatch(terraform, /object_versioning/);
  assert.doesNotMatch(deploy, /curl[^|]*\|\s*(?:sh|bash)/);
  assert.match(deploy, /2\.46\.0/);
  assert.match(deploy, /1\.62\.7/);
  assert.match(deploy, /1\.3\.22/);
});

test("container context excludes local secrets and user media", () => {
  assert.match(dockerignore, /^\.env$/m);
  assert.match(dockerignore, /^\.env\.\*$/m);
  assert.match(dockerignore, /^\*\.mp4$/m);
  assert.match(dockerignore, /^watson-cdi-\*\.png$/m);
});
