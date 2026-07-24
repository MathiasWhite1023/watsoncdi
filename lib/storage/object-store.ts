import { createHash } from "node:crypto";
import { cosRuntimeConfig } from "../ibm-cloud-bindings";
import { subjectHash } from "../auth/session";

export type PutObjectInput = {
  key: string;
  body: Uint8Array;
  contentType: string;
  metadata?: Record<string, string>;
};

export interface ObjectStore {
  put(input: PutObjectInput): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  health(): Promise<{ ok: boolean; latencyMs: number; errorCode?: string }>;
}

const safeFilename = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "document";

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 96);
}

export function documentObjectKey(input: {
  subject: string;
  accountId: string;
  documentId: string;
  filename: string;
  sha256: string;
}): string {
  return [
    "tenants",
    subjectHash(input.subject),
    "accounts",
    safeSegment(input.accountId),
    "documents",
    safeSegment(input.documentId),
    input.sha256.slice(0, 16),
    safeFilename(input.filename),
  ].join("/");
}

function assertSafeKey(key: string) {
  if (
    !key ||
    key.startsWith("/") ||
    key.includes("\\") ||
    key.split("/").includes("..")
  ) {
    throw new Error("INVALID_OBJECT_KEY");
  }
}

let storePromise: Promise<ObjectStore> | undefined;

function boundedTimeout(
  value: string | undefined,
  fallback: number,
  maximum: number,
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(250, Math.min(Math.round(parsed), maximum));
}

export function getObjectStore(): Promise<ObjectStore> {
  if (!storePromise) {
    storePromise = createIbmCosStore().catch((error) => {
      storePromise = undefined;
      throw error;
    });
  }
  return storePromise;
}

async function createIbmCosStore(): Promise<ObjectStore> {
  const config = cosRuntimeConfig();
  if (
    !config.endpoint ||
    !config.bucket ||
    !config.apiKey ||
    !config.serviceInstanceId
  ) {
    throw new Error("OBJECT_STORAGE_NOT_CONFIGURED");
  }
  const imported = await import("ibm-cos-sdk");
  const IBM = imported.default || imported;
  const connectTimeout = boundedTimeout(
    process.env.IBM_COS_CONNECT_TIMEOUT_MS,
    2_500,
    30_000,
  );
  const requestTimeout = boundedTimeout(
    process.env.IBM_COS_REQUEST_TIMEOUT_MS,
    15_000,
    120_000,
  );
  const client = new IBM.S3({
    endpoint: config.endpoint,
    apiKeyId: config.apiKey,
    serviceInstanceId: config.serviceInstanceId,
    signatureVersion: "iam",
    ibmAuthEndpoint: "https://iam.cloud.ibm.com/identity/token",
    httpOptions: {
      connectTimeout,
      timeout: requestTimeout,
    },
  });
  const bucket = config.bucket;

  return {
    async put(input) {
      assertSafeKey(input.key);
      await client
        .putObject({
          Bucket: bucket,
          Key: input.key,
          Body: Buffer.from(input.body),
          ContentType: input.contentType,
          ContentLength: input.body.byteLength,
          Metadata: input.metadata,
        })
        .promise();
    },
    async delete(key) {
      assertSafeKey(key);
      await client.deleteObject({ Bucket: bucket, Key: key }).promise();
    },
    async exists(key) {
      assertSafeKey(key);
      try {
        await client.headObject({ Bucket: bucket, Key: key }).promise();
        return true;
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: unknown }).statusCode)
            : 0;
        if (statusCode === 404) return false;
        throw error;
      }
    },
    async health() {
      const started = Date.now();
      try {
        await client.headBucket({ Bucket: bucket }).promise();
        return { ok: true, latencyMs: Date.now() - started };
      } catch (error) {
        const name =
          error instanceof Error
            ? error.name
            : createHash("sha256")
                .update(String(error))
                .digest("hex")
                .slice(0, 8);
        return {
          ok: false,
          latencyMs: Date.now() - started,
          errorCode: name,
        };
      }
    },
  };
}

export function resetObjectStoreForTests() {
  if (process.env.NODE_ENV === "test") storePromise = undefined;
}
