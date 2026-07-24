import { configurationStatus } from "../ibm-cloud-bindings.ts";

export type DatabaseHealth = {
  ok: boolean;
  latencyMs: number;
  error?: string;
};

export type DatabaseHealthProbe = () => Promise<DatabaseHealth>;
export type ObjectStorageHealthProbe = () => Promise<DatabaseHealth>;

export type ReadinessCheck = {
  name: "application" | "database" | "objectStorage" | "authentication";
  status: "pass" | "fail" | "skip";
  required: boolean;
  latencyMs?: number;
  reasonCode?: string;
};

export type ReadinessReport = {
  ready: boolean;
  checks: ReadinessCheck[];
};

type ReadinessOptions = {
  env?: NodeJS.ProcessEnv;
  databaseProbe?: DatabaseHealthProbe;
  objectStorageProbe?: ObjectStorageHealthProbe;
  timeoutMs?: number;
  cacheTtlMs?: number;
};

const DEFAULT_CACHE_TTL_MS = 5_000;
let cachedReport:
  | {
      expiresAt: number;
      report: ReadinessReport;
    }
  | undefined;
let inFlightAssessment: Promise<ReadinessReport> | undefined;

function isIbmRuntime(env: NodeJS.ProcessEnv) {
  return env.WATSON_CDI_RUNTIME?.toLowerCase() === "ibm";
}

async function probeWithTimeout(
  probe: DatabaseHealthProbe,
  timeoutMs: number,
): Promise<DatabaseHealth> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      probe(),
      new Promise<DatabaseHealth>((resolve) => {
        timer = setTimeout(
          () => resolve({ ok: false, latencyMs: timeoutMs, error: "timeout" }),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function resolveDefaultDatabaseProbe(): Promise<
  DatabaseHealthProbe | undefined
> {
  try {
    const database = await import("../../db/postgres/index");
    return database.checkDatabaseHealth;
  } catch {
    return undefined;
  }
}

async function resolveDefaultObjectStorageProbe(): Promise<
  ObjectStorageHealthProbe | undefined
> {
  try {
    const storage = await import("../storage/object-store");
    return async () => (await storage.getObjectStore()).health();
  } catch {
    return undefined;
  }
}

async function assessReadinessUncached(
  options: ReadinessOptions = {},
): Promise<ReadinessReport> {
  const env = options.env ?? process.env;
  const required = isIbmRuntime(env);
  const timeoutMs = Math.max(250, Math.min(options.timeoutMs ?? 2_500, 10_000));
  const configured = configurationStatus(env);

  const checks: ReadinessCheck[] = [
    {
      name: "application",
      status: "pass",
      required: true,
    },
  ];

  if (!configured.database) {
    checks.push({
      name: "database",
      status: required ? "fail" : "skip",
      required,
      reasonCode: required ? "DATABASE_NOT_CONFIGURED" : undefined,
    });
  } else {
    const databaseProbe =
      options.databaseProbe ?? (await resolveDefaultDatabaseProbe());

    if (!databaseProbe) {
      checks.push({
        name: "database",
        status: "fail",
        required: true,
        reasonCode: "DATABASE_PROBE_UNAVAILABLE",
      });
    } else {
      try {
        const result = await probeWithTimeout(databaseProbe, timeoutMs);
        checks.push({
          name: "database",
          status: result.ok ? "pass" : "fail",
          required: true,
          latencyMs: result.latencyMs,
          reasonCode: result.ok ? undefined : "DATABASE_UNAVAILABLE",
        });
      } catch {
        checks.push({
          name: "database",
          status: "fail",
          required: true,
          reasonCode: "DATABASE_UNAVAILABLE",
        });
      }
    }
  }

  if (!configured.objectStorage) {
    checks.push({
      name: "objectStorage",
      status: required ? "fail" : "skip",
      required,
      reasonCode: required ? "OBJECT_STORAGE_NOT_CONFIGURED" : undefined,
    });
  } else {
    const storageProbe =
      options.objectStorageProbe ??
      (await resolveDefaultObjectStorageProbe());
    if (!storageProbe) {
      checks.push({
        name: "objectStorage",
        status: "fail",
        required: true,
        reasonCode: "OBJECT_STORAGE_PROBE_UNAVAILABLE",
      });
    } else {
      try {
        const result = await probeWithTimeout(storageProbe, timeoutMs);
        checks.push({
          name: "objectStorage",
          status: result.ok ? "pass" : "fail",
          required: true,
          latencyMs: result.latencyMs,
          reasonCode: result.ok ? undefined : "OBJECT_STORAGE_UNAVAILABLE",
        });
      } catch {
        checks.push({
          name: "objectStorage",
          status: "fail",
          required: true,
          reasonCode: "OBJECT_STORAGE_UNAVAILABLE",
        });
      }
    }
  }

  const authenticationConfigured =
    configured.authentication && configured.sessionSecret && configured.baseUrl;
  checks.push({
    name: "authentication",
    status: authenticationConfigured ? "pass" : required ? "fail" : "skip",
    required,
    reasonCode:
      !authenticationConfigured && required
        ? "AUTHENTICATION_NOT_CONFIGURED"
        : undefined,
  });

  return {
    ready: checks.every((check) => check.status !== "fail"),
    checks,
  };
}

function sharedCacheTtl(options: ReadinessOptions): number {
  const explicitlyEnabled = options.cacheTtlMs !== undefined;
  const defaultInvocation =
    options.env === undefined &&
    options.databaseProbe === undefined &&
    options.objectStorageProbe === undefined &&
    options.timeoutMs === undefined;

  if (!explicitlyEnabled && !defaultInvocation) return 0;
  return Math.max(
    0,
    Math.min(options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS, 10_000),
  );
}

export async function assessReadiness(
  options: ReadinessOptions = {},
): Promise<ReadinessReport> {
  const cacheTtlMs = sharedCacheTtl(options);
  if (cacheTtlMs === 0) return assessReadinessUncached(options);

  const now = Date.now();
  if (cachedReport && cachedReport.expiresAt > now) {
    return cachedReport.report;
  }
  if (inFlightAssessment) return inFlightAssessment;

  const assessment = assessReadinessUncached(options)
    .then((report) => {
      cachedReport = {
        expiresAt: Date.now() + cacheTtlMs,
        report,
      };
      return report;
    })
    .finally(() => {
      if (inFlightAssessment === assessment) inFlightAssessment = undefined;
    });
  inFlightAssessment = assessment;
  return assessment;
}

export function resetReadinessCacheForTests() {
  if (process.env.NODE_ENV === "test") {
    cachedReport = undefined;
    inFlightAssessment = undefined;
  }
}
