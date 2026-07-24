import pg from "pg";

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed PostgreSQL.");
}

const parsed = new URL(connectionString);
const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
const sslMode = (
  process.env.DATABASE_SSL_MODE || (local ? "disable" : "verify-full")
).toLowerCase();
if (
  process.env.NODE_ENV === "production" &&
  (sslMode === "disable" ||
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false")
) {
  throw new Error("PostgreSQL TLS verification cannot be disabled in production.");
}
for (const parameter of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) {
  parsed.searchParams.delete(parameter);
}
const caValue =
  process.env.DATABASE_CA_CERT_BASE64 || process.env.DATABASE_CA_CERT;
const ca = caValue
  ? (caValue.includes("BEGIN CERTIFICATE")
      ? caValue
      : Buffer.from(caValue, "base64").toString("utf8")
    ).replace(/\\n/g, "\n")
  : undefined;
const pool = new pg.Pool({
  connectionString: parsed.toString(),
  ssl:
    sslMode === "disable"
      ? false
      : { rejectUnauthorized: true, ca, servername: parsed.hostname },
  max: 1,
  application_name: "watson-cdi-seed",
});

const now = new Date().toISOString();
const accounts = [
  {
    id: "demo-finserv",
    name: "Northstar Financial",
    industry: "Financial services",
    size: "10,000+ employees",
    owner: "IBM Partner Team",
    stage: "Discovery",
    progress: 72,
    priority: "Alta",
    challenge:
      "Reduce hybrid-cloud cost while improving governance and application resilience.",
    scores: [
      { name: "FinOps", short: "FinOps", alignment: 88, value: 91, readiness: 70, confidence: 84, level: "Alta", evidence: ["Cloud cost growth"], action: "Validate allocation model" },
      { name: "AI Governance", short: "AI Gov", alignment: 79, value: 86, readiness: 62, confidence: 72, level: "Alta", evidence: ["New AI initiatives"], action: "Map model risk controls" },
    ],
  },
  {
    id: "demo-retail",
    name: "BluePeak Retail",
    industry: "Retail",
    size: "5,000–10,000 employees",
    owner: "IBM Partner Team",
    stage: "Exploration",
    progress: 54,
    priority: "Média",
    challenge:
      "Unify trusted customer data and automate operational handoffs across channels.",
    scores: [
      { name: "Trusted Data", short: "Data", alignment: 84, value: 88, readiness: 58, confidence: 73, level: "Alta", evidence: ["Fragmented data"], action: "Confirm data owners" },
      { name: "Automation", short: "Auto", alignment: 76, value: 80, readiness: 66, confidence: 69, level: "Alta", evidence: ["Manual handoffs"], action: "Map one priority workflow" },
    ],
  },
  {
    id: "demo-industry",
    name: "Apex Manufacturing",
    industry: "Manufacturing",
    size: "10,000+ employees",
    owner: "IBM Partner Team",
    stage: "Discovery",
    progress: 63,
    priority: "Alta",
    challenge:
      "Modernize critical applications without disrupting plant operations.",
    scores: [
      { name: "App Modernization", short: "Modernize", alignment: 90, value: 92, readiness: 61, confidence: 78, level: "Alta", evidence: ["Legacy dependencies"], action: "Prioritize application candidates" },
      { name: "Hybrid Cloud", short: "Cloud", alignment: 81, value: 83, readiness: 67, confidence: 75, level: "Alta", evidence: ["Mixed estate"], action: "Map workload dependencies" },
    ],
  },
];

const client = await pool.connect();
try {
  await client.query("BEGIN");
  for (const account of accounts) {
    await client.query(
      `INSERT INTO discoveries (
        id, customer_name, industry, company_size, owner, stage, progress,
        priority, challenge_summary, answers_json, scores_json,
        recommendations_json, next_engagement, created_at, updated_at,
        owner_email, owner_subject, visibility, data_classification,
        company_domain, last_analyzed_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,'[]',$10,'[]',$11,$12,$12,
        NULL,NULL,'demo','test',NULL,$12
      ) ON CONFLICT (id) DO NOTHING`,
      [
        account.id,
        account.name,
        account.industry,
        account.size,
        account.owner,
        account.stage,
        account.progress,
        account.priority,
        account.challenge,
        JSON.stringify(account.scores),
        "Review the recommended next conversation",
        now,
      ],
    );
    await client.query(
      `INSERT INTO account_memory (
        discovery_id, executive_summary, known_json, assumptions_json,
        gaps_json, changes_json, ai_status, version, updated_at
      ) VALUES ($1,$2,$3,'[]',$4,'[]','fallback',1,$5)
      ON CONFLICT (discovery_id) DO NOTHING`,
      [
        account.id,
        account.challenge,
        JSON.stringify([account.challenge]),
        JSON.stringify(["Executive sponsor", "Success metric"]),
        now,
      ],
    );
    await client.query(
      `INSERT INTO account_events (
        id, discovery_id, type, title, content, source_type, source_id,
        evidence_status, confidence, occurred_at, created_at
      ) VALUES ($1,$2,'note','Initial account context',$3,'seed',NULL,
        'reported',75,$4,$4) ON CONFLICT (id) DO NOTHING`,
      [`${account.id}-initial-context`, account.id, account.challenge, now],
    );
  }
  await client.query("COMMIT");
  console.log(`Seeded ${accounts.length} synthetic demo accounts.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
