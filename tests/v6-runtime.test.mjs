import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createLogger,
  errorForLog,
  sanitizeLogContext,
} from "../lib/platform/logger.ts";
import {
  assessReadiness,
  resetReadinessCacheForTests,
} from "../lib/platform/readiness.ts";
import { mutationOriginIsValid } from "../lib/auth/csrf.ts";

const root = new URL("../", import.meta.url);

async function readProjectFile(path) {
  return readFile(new URL(path, root), "utf8");
}

test("builds an IBM standalone image as a non-root Node 22 process", async () => {
  const [dockerfile, dockerignore, nextConfig, packageJson] = await Promise.all([
    readProjectFile("Dockerfile"),
    readProjectFile(".dockerignore"),
    readProjectFile("next.config.ts"),
    readProjectFile("package.json").then(JSON.parse),
  ]);

  assert.match(dockerfile, /FROM node:22-bookworm-slim AS runner/);
  assert.match(dockerfile, /npm prune --omit=dev/);
  assert.match(
    dockerfile,
    /COPY --from=production-dependencies --chown=node:node \/app\/node_modules/,
  );
  assert.match(dockerfile, /COPY --from=builder --chown=node:node/);
  assert.match(dockerfile, /db\/postgres\/migrations/);
  assert.match(dockerfile, /USER node/);
  assert.match(dockerfile, /EXPOSE 8080/);
  assert.match(dockerfile, /CMD \["node", "server\.js"\]/);
  assert.match(dockerignore, /^\.env\.\*$/m);
  assert.match(dockerignore, /^\*\.mp4$/m);
  assert.match(nextConfig, /output: "standalone"/);
  assert.match(nextConfig, /cloudflare:workers/);
  assert.equal(
    packageJson.scripts["build:ibm"],
    "WATSON_CDI_RUNTIME=ibm next build --webpack",
  );
  assert.match(packageJson.scripts["start:ibm"], /node \.next\/standalone\/server\.js/);
  assert.equal(
    packageJson.scripts["db:migrate"],
    "node db/postgres/migrate.mjs",
  );
  assert.match(packageJson.scripts.test, /--experimental-strip-types/);
  assert.match(packageJson.scripts.build, /vinext build/);
});

test("reports missing IBM dependencies without exposing configuration values", async () => {
  const report = await assessReadiness({
    env: {
      WATSON_CDI_RUNTIME: "ibm",
      DATABASE_URL: "postgres://secret-user:secret-password@private-host/db",
    },
    databaseProbe: async () => ({ ok: true, latencyMs: 4 }),
  });
  const serialized = JSON.stringify(report);

  assert.equal(report.ready, false);
  assert.deepEqual(
    report.checks.map(({ name, status }) => [name, status]),
    [
      ["application", "pass"],
      ["database", "pass"],
      ["objectStorage", "fail"],
      ["authentication", "fail"],
    ],
  );
  assert.doesNotMatch(serialized, /secret-user|secret-password|private-host/);
  assert.match(serialized, /OBJECT_STORAGE_NOT_CONFIGURED/);
});

test("reports the IBM runtime ready after dependency checks pass", async () => {
  const report = await assessReadiness({
    env: {
      WATSON_CDI_RUNTIME: "ibm",
      DATABASE_URL: "postgres://configured",
      IBM_COS_ENDPOINT: "https://configured",
      IBM_COS_BUCKET: "configured",
      IBM_COS_API_KEY: "configured",
      IBM_COS_SERVICE_INSTANCE_ID: "configured",
      APPID_DISCOVERY_URL: "https://configured/.well-known/openid-configuration",
      APPID_CLIENT_ID: "configured",
      APPID_CLIENT_SECRET: "configured",
      SESSION_SECRET: "configured-with-at-least-thirty-two-characters",
      APP_BASE_URL: "https://configured.example",
    },
    databaseProbe: async () => ({ ok: true, latencyMs: 7 }),
    objectStorageProbe: async () => ({ ok: true, latencyMs: 5 }),
  });

  assert.equal(report.ready, true);
  assert.equal(report.checks.find((check) => check.name === "database")?.latencyMs, 7);
  assert.ok(report.checks.every((check) => check.status === "pass"));
});

test("fails readiness safely when the database probe times out", async () => {
  const report = await assessReadiness({
    env: {
      WATSON_CDI_RUNTIME: "ibm",
      DATABASE_URL: "postgres://configured",
      IBM_COS_ENDPOINT: "https://configured",
      IBM_COS_BUCKET: "configured",
      IBM_COS_API_KEY: "configured",
      IBM_COS_SERVICE_INSTANCE_ID: "configured",
      APPID_DISCOVERY_URL: "https://configured/.well-known/openid-configuration",
      APPID_CLIENT_ID: "configured",
      APPID_CLIENT_SECRET: "configured",
      SESSION_SECRET: "configured-with-at-least-thirty-two-characters",
      APP_BASE_URL: "https://configured.example",
    },
    databaseProbe: () => new Promise(() => {}),
    objectStorageProbe: async () => ({ ok: true, latencyMs: 2 }),
    timeoutMs: 1,
  });

  assert.equal(report.ready, false);
  assert.equal(
    report.checks.find((check) => check.name === "database")?.reasonCode,
    "DATABASE_UNAVAILABLE",
  );
});

test("deduplicates concurrent readiness probes and briefly caches their result", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  resetReadinessCacheForTests();

  let databaseCalls = 0;
  let objectStorageCalls = 0;
  const env = {
    WATSON_CDI_RUNTIME: "ibm",
    DATABASE_URL: "postgres://configured",
    IBM_COS_ENDPOINT: "https://configured",
    IBM_COS_BUCKET: "configured",
    IBM_COS_API_KEY: "configured",
    IBM_COS_SERVICE_INSTANCE_ID: "configured",
    APPID_DISCOVERY_URL: "https://configured/.well-known/openid-configuration",
    APPID_CLIENT_ID: "configured",
    APPID_CLIENT_SECRET: "configured",
    SESSION_SECRET: "configured-with-at-least-thirty-two-characters",
    APP_BASE_URL: "https://configured.example",
  };
  const options = {
    env,
    databaseProbe: async () => {
      databaseCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { ok: true, latencyMs: 5 };
    },
    objectStorageProbe: async () => {
      objectStorageCalls += 1;
      return { ok: true, latencyMs: 2 };
    },
    cacheTtlMs: 1_000,
  };

  try {
    const [first, second] = await Promise.all([
      assessReadiness(options),
      assessReadiness(options),
    ]);
    const cached = await assessReadiness(options);

    assert.equal(first.ready, true);
    assert.equal(second, first);
    assert.equal(cached, first);
    assert.equal(databaseCalls, 1);
    assert.equal(objectStorageCalls, 1);
  } finally {
    resetReadinessCacheForTests();
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test("requires exact origin or same-origin browser metadata for mutations", () => {
  const previousBaseUrl = process.env.APP_BASE_URL;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.APP_BASE_URL = "https://watson.example";
  process.env.NODE_ENV = "production";

  try {
    assert.equal(
      mutationOriginIsValid(
        new Request("https://watson.example/api/resource", {
          method: "POST",
          headers: { Origin: "https://watson.example" },
        }),
      ),
      true,
    );
    assert.equal(
      mutationOriginIsValid(
        new Request("https://watson.example/api/resource", {
          method: "POST",
          headers: { Origin: "https://attacker.example" },
        }),
      ),
      false,
    );
    assert.equal(
      mutationOriginIsValid(
        new Request("https://watson.example/api/resource", {
          method: "POST",
          headers: { "Sec-Fetch-Site": "same-origin" },
        }),
      ),
      true,
    );
    assert.equal(
      mutationOriginIsValid(
        new Request("https://watson.example/api/resource", {
          method: "POST",
          headers: { "Sec-Fetch-Site": "same-site" },
        }),
      ),
      false,
    );
  } finally {
    if (previousBaseUrl === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = previousBaseUrl;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test("structured logger keeps only allowlisted operational context", () => {
  const context = sanitizeLogContext({
    route: "/api/health/ready?email=private@example.com",
    statusCode: 200,
    errorCode: "failure includes private@example.com",
    email: "private@example.com",
    token: "top-secret",
    notes: "customer-sensitive",
    nested: { password: "hidden" },
  });

  assert.deepEqual(context, {
    route: "/api/health/ready",
    statusCode: 200,
    errorCode: "[redacted]",
  });
  assert.deepEqual(errorForLog(new Error("email private@example.com")), {
    errorName: "Error",
  });

  const records = [];
  const originalInfo = console.info;
  console.info = (value) => records.push(JSON.parse(value));

  try {
    createLogger("runtime").info("test.completed", {
      statusCode: 200,
      email: "private@example.com",
    });
  } finally {
    console.info = originalInfo;
  }

  assert.equal(records.length, 1);
  assert.equal(records[0].component, "runtime");
  assert.equal(records[0].statusCode, 200);
  assert.equal("email" in records[0], false);
});

test("health endpoint responses are uncached and never return environment values", async () => {
  const [live, ready] = await Promise.all([
    readProjectFile("app/api/health/live/route.ts"),
    readProjectFile("app/api/health/ready/route.ts"),
  ]);

  assert.match(live, /"Cache-Control": "no-store"/);
  assert.match(ready, /"Cache-Control": "no-store"/);
  assert.match(ready, /statusCode = report\.ready \? 200 : 503/);
  assert.doesNotMatch(ready, /DATABASE_URL|IBM_COS_API_KEY|APPID_CLIENT_SECRET/);
});

test("database and COS clients enforce sanitized errors and bounded network timeouts", async () => {
  const [databaseClient, objectStore] = await Promise.all([
    readProjectFile("db/postgres/client.ts"),
    readProjectFile("lib/storage/object-store.ts"),
  ]);

  assert.match(databaseClient, /logger\.error\("pool\.error"/);
  assert.match(databaseClient, /errorForLog\(error\)/);
  assert.doesNotMatch(databaseClient, /message:\s*error\.message/);
  assert.match(objectStore, /IBM_COS_CONNECT_TIMEOUT_MS/);
  assert.match(objectStore, /IBM_COS_REQUEST_TIMEOUT_MS/);
  assert.match(objectStore, /httpOptions:\s*\{/);
  assert.match(objectStore, /connectTimeout/);
  assert.match(objectStore, /timeout:\s*requestTimeout/);
});
