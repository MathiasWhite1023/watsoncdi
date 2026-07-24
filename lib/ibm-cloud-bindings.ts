type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;

const nonEmpty = (value: unknown): string | undefined => {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
};

function parseServices(
  environment: Record<string, string | undefined> = process.env,
): JsonRecord {
  const raw = environment.CE_SERVICES || environment.VCAP_SERVICES;
  if (!raw) return {};
  try {
    return asRecord(JSON.parse(raw)) || {};
  } catch {
    return {};
  }
}

function serviceEntries(
  environment: Record<string, string | undefined> = process.env,
): JsonRecord[] {
  return Object.entries(parseServices(environment)).flatMap(
    ([serviceName, value]) => {
      const items = Array.isArray(value) ? value : [value];
      return items
        .map(asRecord)
        .filter((item): item is JsonRecord => Boolean(item))
        .map((item) => ({ ...item, __serviceName: serviceName }));
    },
  );
}

function service(
  aliases: string[],
  environment: Record<string, string | undefined> = process.env,
): { binding: JsonRecord; credentials: JsonRecord } | null {
  const normalizedAliases = aliases.map((item) => item.toLowerCase());
  for (const binding of serviceEntries(environment)) {
    const credentials = asRecord(binding.credentials) || binding;
    const candidates = [
      binding.__serviceName,
      binding.name,
      binding.label,
      binding.service,
      binding.type,
      credentials.type,
      credentials.service,
    ]
      .map(nonEmpty)
      .filter((item): item is string => Boolean(item))
      .map((item) => item.toLowerCase());
    if (
      candidates.some((candidate) =>
        normalizedAliases.some((alias) => candidate.includes(alias)),
      )
    ) {
      return { binding, credentials };
    }
  }
  return null;
}

function first(
  record: JsonRecord | null | undefined,
  keys: string[],
): string | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = nonEmpty(record[key]);
    if (value) return value;
  }
  return undefined;
}

function nested(
  record: JsonRecord | null | undefined,
  path: string[],
): JsonRecord | null {
  let cursor: JsonRecord | null = record || null;
  for (const key of path) {
    cursor = asRecord(cursor?.[key]);
    if (!cursor) return null;
  }
  return cursor;
}

export type DatabaseRuntimeConfig = {
  url?: string;
  caCertificateBase64?: string;
};

export function databaseRuntimeConfig(
  environment: Record<string, string | undefined> = process.env,
): DatabaseRuntimeConfig {
  const bound = service(
    ["databases-for-postgresql", "postgresql", "postgres"],
    environment,
  );
  const credentials = bound?.credentials;
  const connection = nested(credentials, ["connection", "postgres"]);
  const certificate = nested(connection, ["certificate"]);
  const composed = connection?.composed;
  const composedUrl =
    Array.isArray(composed) && typeof composed[0] === "string"
      ? nonEmpty(composed[0])
      : first(asRecord(composed), ["0", "uri"]);
  return {
    url:
      nonEmpty(environment.DATABASE_URL) ||
      first(credentials, ["DATABASE_URL", "database_url", "uri", "url"]) ||
      composedUrl ||
      first(connection, ["uri"]),
    caCertificateBase64:
      nonEmpty(environment.DATABASE_CA_CERT_BASE64) ||
      first(credentials, [
        "DATABASE_CA_CERT_BASE64",
        "certificate_base64",
        "ca_certificate_base64",
      ]) ||
      first(certificate, ["certificate_base64", "base64"]),
  };
}

export type CosRuntimeConfig = {
  endpoint?: string;
  bucket?: string;
  apiKey?: string;
  serviceInstanceId?: string;
};

export function cosRuntimeConfig(
  environment: Record<string, string | undefined> = process.env,
): CosRuntimeConfig {
  const bound = service(
    ["cloud-object-storage", "object-storage", "cos"],
    environment,
  );
  const credentials = bound?.credentials;
  return {
    endpoint:
      nonEmpty(environment.IBM_COS_ENDPOINT) ||
      first(credentials, ["endpoint", "s3_endpoint", "IBM_COS_ENDPOINT"]),
    bucket:
      nonEmpty(environment.IBM_COS_BUCKET) ||
      first(credentials, ["bucket", "bucket_name", "IBM_COS_BUCKET"]),
    apiKey:
      nonEmpty(environment.IBM_COS_API_KEY) ||
      first(credentials, ["apikey", "api_key", "IBM_COS_API_KEY"]),
    serviceInstanceId:
      nonEmpty(environment.IBM_COS_SERVICE_INSTANCE_ID) ||
      first(credentials, [
        "resource_instance_id",
        "service_instance_id",
        "IBM_COS_SERVICE_INSTANCE_ID",
      ]),
  };
}

export type AppIdRuntimeConfig = {
  discoveryUrl?: string;
  clientId?: string;
  clientSecret?: string;
};

export function appIdRuntimeConfig(
  environment: Record<string, string | undefined> = process.env,
): AppIdRuntimeConfig {
  const bound = service(["appid", "app-id"], environment);
  const credentials = bound?.credentials;
  const oauthServerUrl = first(credentials, [
    "oauthServerUrl",
    "oauth_server_url",
  ]);
  return {
    discoveryUrl:
      nonEmpty(environment.APPID_DISCOVERY_URL) ||
      first(credentials, [
        "discoveryEndpoint",
        "discovery_endpoint",
        "APPID_DISCOVERY_URL",
      ]) ||
      (oauthServerUrl
        ? `${oauthServerUrl.replace(/\/$/, "")}/.well-known/openid-configuration`
        : undefined),
    clientId:
      nonEmpty(environment.APPID_CLIENT_ID) ||
      first(credentials, ["clientId", "client_id", "APPID_CLIENT_ID"]),
    clientSecret:
      nonEmpty(environment.APPID_CLIENT_SECRET) ||
      first(credentials, [
        "secret",
        "clientSecret",
        "client_secret",
        "APPID_CLIENT_SECRET",
      ]),
  };
}

export function configurationStatus(
  environment: Record<string, string | undefined> = process.env,
) {
  const database = databaseRuntimeConfig(environment);
  const cos = cosRuntimeConfig(environment);
  const appId = appIdRuntimeConfig(environment);
  return {
    database: Boolean(database.url),
    objectStorage: Boolean(
      cos.endpoint && cos.bucket && cos.apiKey && cos.serviceInstanceId,
    ),
    authentication: Boolean(
      appId.discoveryUrl && appId.clientId && appId.clientSecret,
    ),
    sessionSecret: Boolean(environment.SESSION_SECRET),
    baseUrl: Boolean(environment.APP_BASE_URL),
  };
}
