import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readProjectFile(path) {
  return readFile(new URL(path, root), "utf8");
}

test("allows every verified App ID identity to enter and create private accounts", async () => {
  const [api, workspace, session, appId] = await Promise.all([
    readProjectFile("app/api/discoveries/route.ts"),
    readProjectFile("app/workspace/page.tsx"),
    readProjectFile("lib/auth/session.ts"),
    readProjectFile("lib/auth/app-id.ts"),
  ]);

  assert.match(api, /identityFromRequest/);
  assert.match(api, /if \(!identity\)/);
  assert.match(api, /AUTH_REQUIRED/);
  assert.doesNotMatch(api, /PRIVATE_ALLOWED_EMAILS/);
  assert.doesNotMatch(api, /allowlistConfigured|identity\.allowed/);
  assert.doesNotMatch(api, /WORKSPACE_(?:ALLOWLIST_NOT_CONFIGURED|EMAIL_NOT_ALLOWED)/);

  const createStart = api.indexOf('if (body.action === "create")');
  const createEnd = api.indexOf('if (body.action === "briefing")');
  assert.ok(createStart >= 0 && createEnd > createStart);
  const createAccount = api.slice(createStart, createEnd);
  assert.match(createAccount, /INSERT INTO discoveries/);
  assert.match(createAccount, /identity\.email/);
  assert.match(createAccount, /identity\.subject/);
  assert.match(createAccount, /"private"/);
  assert.match(workspace, /requireCurrentIdentity\("\/workspace"\)/);
  assert.match(session, /identity\.provider/);
  assert.match(appId, /provider:\s*"ibm-app-id"/);
  assert.match(appId, /IBM App ID email verification is required/);
});

test("rejects unauthenticated private requests across account and document APIs", async () => {
  const [api, documents, aiStatus] = await Promise.all([
    readProjectFile("app/api/discoveries/route.ts"),
    readProjectFile("app/api/accounts/[id]/documents/route.ts"),
    readProjectFile("app/api/ai/status/route.ts"),
  ]);

  assert.match(api, /if \(!identity\)/);
  assert.match(api, /"AUTH_REQUIRED",\s*401/);
  assert.match(documents, /if \(!identity\)/);
  assert.match(documents, /"AUTH_REQUIRED",\s*401/);
  assert.match(aiStatus, /if \(!identity\)/);
  assert.match(aiStatus, /"AUTH_REQUIRED",\s*401/);
});

test("preserves strict owner isolation for private reads and mutations", async () => {
  const [api, documents] = await Promise.all([
    readProjectFile("app/api/discoveries/route.ts"),
    readProjectFile("app/api/accounts/[id]/documents/route.ts"),
  ]);

  assert.match(
    api,
    /SELECT \* FROM discoveries WHERE visibility = 'private' AND owner_subject = \?/,
  );
  assert.match(
    api,
    /SELECT \* FROM discoveries WHERE id = \? AND visibility = 'private' AND owner_subject = \?/,
  );
  assert.match(
    documents,
    /SELECT id FROM discoveries WHERE id = \? AND visibility = 'private' AND owner_subject = \?/,
  );
  assert.match(documents, /\.bind\(id, identity\.subject\)/);
  assert.doesNotMatch(documents, /PRIVATE_ALLOWED_EMAILS|allowlist\.includes/);
});

test("keeps the unauthenticated public demo synthetic and read-only", async () => {
  const api = await readProjectFile("app/api/discoveries/route.ts");

  assert.match(api, /scope === "demo" \? localizeDemoPayload/);
  assert.match(api, /if \(scope !== "private"\)/);
  assert.match(api, /demonstração pública é somente leitura/i);
  assert.match(api, /\{ status: 403 \}/);
  assert.match(api, /skipGenerative:\s*true,\s*skipEmbeddings:\s*true/);
});

test("does not tell users that an email authorization list is required", async () => {
  const productFacing = (
    await Promise.all([
      readProjectFile("app/page.tsx"),
      readProjectFile("app/workspace/page.tsx"),
      readProjectFile("lib/app-messages.ts"),
      readProjectFile("lib/i18n.ts"),
      readProjectFile("app/api/discoveries/route.ts"),
      readProjectFile("app/api/accounts/[id]/documents/route.ts"),
      readProjectFile("app/api/ai/status/route.ts"),
    ])
  ).join("\n");

  assert.doesNotMatch(productFacing, /PRIVATE_ALLOWED_EMAILS/);
  assert.doesNotMatch(productFacing, /WORKSPACE_ALLOWLIST_NOT_CONFIGURED/);
  assert.doesNotMatch(productFacing, /WORKSPACE_EMAIL_NOT_ALLOWED/);
  assert.doesNotMatch(productFacing, /(?:email|e-mail).{0,40}(?:allowlist|lista de autorizados)/i);
  assert.doesNotMatch(productFacing, /(?:allowlist|lista de autorizados).{0,40}(?:email|e-mail)/i);
});

test("documents the V6 pilot and preserves the V5.3.1 rollback", async () => {
  const [readme, changelog] = await Promise.all([
    readProjectFile("README.md"),
    readProjectFile("CHANGELOG.md"),
  ]);

  assert.match(readme, /IBM Cloud Pilot V6/);
  assert.match(readme, /verified IBM App ID user/i);
  assert.match(readme, /codex\/ibm-cloud-portability-v6/);
  assert.match(readme, /v5\.3\.1-open-authenticated-workspace/);
  assert.match(readme, /OpenAI Sites deployment\s+is not changed by the pilot/i);
  assert.match(changelog, /v5\.3\.1-open-authenticated-workspace/);
  assert.match(
    changelog,
    /Rollback tag: `v5\.3\.1-open-authenticated-workspace`/,
  );
  assert.match(changelog, /No IBM resource has been created/i);
});
