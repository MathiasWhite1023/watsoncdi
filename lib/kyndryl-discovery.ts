import type { Locale } from "./i18n";

export const KYNDYRL_DISCOVERY_VERSION = "2026.2-kyndryl";

export const KYNDYRL_PILLAR_KEYS = [
  "ibm-z",
  "infrastructure-modernization",
  "application-modernization",
  "sap-transformation",
  "modern-operations",
  "data-ai",
  "modern-workplace",
  "cyber-security",
] as const;

export type KyndrylPillarKey = (typeof KYNDYRL_PILLAR_KEYS)[number];
export type DiscoveryResponse = "YES" | "NO" | "NOT_APPLICABLE" | "DONT_KNOW";
export type EvidencePolarity = "POSITIVE" | "GAP";
export type AttachClassification =
  | "LEAD_ATTACH"
  | "OPPORTUNITY_ATTACH"
  | "EXPANSION_ATTACH";

type Localized = { en: string; pt: string };

export type KyndrylJourney = {
  id: string;
  label: Localized;
  description: Localized;
};

export type KyndrylCapability = {
  id: string;
  label: Localized;
  journeyId: string;
};

export type KyndrylTechnology = {
  id: string;
  name: string;
  journeyId: string;
  attach: AttachClassification;
  description: Localized;
  capabilityIds: string[];
  requiredGate?: {
    questionId: string;
    response: DiscoveryResponse;
  };
};

export type ResponseEvidenceMapping = {
  evidenceId: string;
  label: Localized;
  polarity: EvidencePolarity;
  strength: number;
  technologyFit: number;
  technologyIds: string[];
};

export type KyndrylQuestion = {
  id: string;
  pillar: KyndrylPillarKey;
  journeyIds: string[];
  capabilityIds: string[];
  title: Localized;
  question: Localized;
  rationale: Localized;
  hint: Localized;
  businessImpact: number;
  keywords: string[];
  responseMapping: {
    YES: ResponseEvidenceMapping;
    NO: ResponseEvidenceMapping;
  };
};

export type KyndrylPillar = {
  key: KyndrylPillarKey;
  label: Localized;
  shortLabel: Localized;
  description: Localized;
  objective: Localized;
  workshop: Localized;
  outcomes: Localized[];
  journeys: KyndrylJourney[];
  capabilities: KyndrylCapability[];
  technologies: KyndrylTechnology[];
  questions: KyndrylQuestion[];
};

const l = (en: string, pt: string): Localized => ({ en, pt });
const localized = (value: Localized, locale: Locale) =>
  locale === "pt-BR" ? value.pt : value.en;
const capability = (
  id: string,
  en: string,
  pt: string,
  journeyId: string,
): KyndrylCapability => ({ id, label: l(en, pt), journeyId });
const technology = (
  id: string,
  name: string,
  journeyId: string,
  attach: AttachClassification,
  capabilityIds: string[],
  en: string,
  pt: string,
  requiredGate?: KyndrylTechnology["requiredGate"],
): KyndrylTechnology => ({
  id,
  name,
  journeyId,
  attach,
  capabilityIds,
  description: l(en, pt),
  requiredGate,
});

type QuestionInput = {
  id: string;
  pillar: KyndrylPillarKey;
  journeyIds: string[];
  capabilityIds: string[];
  title: Localized;
  question: Localized;
  rationale: Localized;
  hint?: Localized;
  businessImpact: number;
  keywords: string[];
  technologyIds: string[];
  mode?: "gap-on-no" | "opportunity-on-yes" | "gate";
};

function question(input: QuestionInput): KyndrylQuestion {
  const mode = input.mode || "gap-on-no";
  const yesIsGap = mode === "opportunity-on-yes";
  const yesLabel = yesIsGap
    ? l(
        "Confirmed transformation need",
        "Necessidade de transformação confirmada",
      )
    : l("Capability present", "Capacidade existente");
  const noLabel = yesIsGap
    ? l("No current initiative", "Sem iniciativa atual")
    : l("Capability gap", "Lacuna de capacidade");
  return {
    ...input,
    hint:
      input.hint ||
      l(
        "Add customer context, metrics, ownership, and the source behind the answer.",
        "Acrescente contexto do cliente, métricas, responsáveis e a fonte da resposta.",
      ),
    responseMapping: {
      YES: {
        evidenceId: `${input.id}:YES`,
        label: yesLabel,
        polarity: yesIsGap ? "GAP" : "POSITIVE",
        strength: mode === "gate" ? 100 : yesIsGap ? 90 : 72,
        technologyFit: mode === "gate" ? 72 : yesIsGap ? 92 : 26,
        technologyIds: input.technologyIds,
      },
      NO: {
        evidenceId: `${input.id}:NO`,
        label: noLabel,
        polarity: yesIsGap ? "POSITIVE" : "GAP",
        strength: mode === "gate" ? 100 : yesIsGap ? 58 : 96,
        technologyFit: mode === "gate" ? 0 : yesIsGap ? 12 : 94,
        technologyIds: input.technologyIds,
      },
    },
  };
}

const ibmZGate = { questionId: "ibmz-platform", response: "YES" as const };

const ibmZ: KyndrylPillar = {
  key: "ibm-z",
  label: l(
    "IBM Z Modernization & Hybrid Operations",
    "Modernização IBM Z e operações híbridas",
  ),
  shortLabel: l("IBM Z", "IBM Z"),
  description: l(
    "Run, modernize, secure, and optimize IBM Z as part of a hybrid operating model.",
    "Operar, modernizar, proteger e otimizar IBM Z dentro de um modelo híbrido.",
  ),
  objective: l(
    "Modernize IBM Z environments while preserving mission-critical resilience and connecting them to hybrid cloud.",
    "Modernizar ambientes IBM Z preservando a resiliência de cargas críticas e integrando-os à nuvem híbrida.",
  ),
  workshop: l(
    "IBM Z modernization and hybrid operations assessment",
    "Assessment de modernização IBM Z e operações híbridas",
  ),
  outcomes: [
    l(
      "Operational visibility and automation",
      "Visibilidade operacional e automação",
    ),
    l(
      "Hybrid integration and application modernization",
      "Integração híbrida e modernização de aplicações",
    ),
    l(
      "Cyber resilience and data protection",
      "Resiliência cibernética e proteção de dados",
    ),
    l(
      "AI-driven capacity and cost optimization",
      "Otimização de capacidade e custos orientada por IA",
    ),
  ],
  journeys: [
    {
      id: "ibmz-run",
      label: l("Run", "Operar"),
      description: l(
        "Operate IBM Z with confidence.",
        "Operar IBM Z com confiança.",
      ),
    },
    {
      id: "ibmz-modernize",
      label: l("Modernize", "Modernizar"),
      description: l(
        "Extend IBM Z into hybrid cloud.",
        "Estender IBM Z à nuvem híbrida.",
      ),
    },
    {
      id: "ibmz-secure",
      label: l("Secure", "Proteger"),
      description: l(
        "Protect identities, data, and recovery.",
        "Proteger identidades, dados e recuperação.",
      ),
    },
    {
      id: "ibmz-optimize",
      label: l("Optimize", "Otimizar"),
      description: l(
        "Improve cost and operational efficiency.",
        "Melhorar custos e eficiência operacional.",
      ),
    },
  ],
  capabilities: [
    capability(
      "ibmz-observability",
      "Operational observability",
      "Observabilidade operacional",
      "ibmz-run",
    ),
    capability(
      "ibmz-aiops",
      "AIOps and incident correlation",
      "AIOps e correlação de incidentes",
      "ibmz-run",
    ),
    capability(
      "ibmz-hybrid-integration",
      "Hybrid integration",
      "Integração híbrida",
      "ibmz-modernize",
    ),
    capability(
      "ibmz-app-modernization",
      "Application modernization",
      "Modernização de aplicações",
      "ibmz-modernize",
    ),
    capability(
      "ibmz-security",
      "Security and identity protection",
      "Proteção de segurança e identidade",
      "ibmz-secure",
    ),
    capability(
      "ibmz-resilience",
      "Cyber resilience",
      "Resiliência cibernética",
      "ibmz-secure",
    ),
    capability(
      "ibmz-cost",
      "Capacity and cost optimization",
      "Otimização de capacidade e custos",
      "ibmz-optimize",
    ),
  ],
  technologies: [
    technology(
      "ibmz-instana",
      "IBM Instana",
      "ibmz-run",
      "LEAD_ATTACH",
      ["ibmz-observability"],
      "Full-stack observability across IBM Z and hybrid applications.",
      "Observabilidade full-stack entre IBM Z e aplicações híbridas.",
      ibmZGate,
    ),
    technology(
      "ibmz-zaiops",
      "IBM Z AIOps",
      "ibmz-run",
      "OPPORTUNITY_ATTACH",
      ["ibmz-aiops"],
      "AI-assisted event correlation and predictive analytics.",
      "Correlação de eventos e análise preditiva assistidas por IA.",
      ibmZGate,
    ),
    technology(
      "ibmz-omegamon",
      "IBM OMEGAMON",
      "ibmz-run",
      "OPPORTUNITY_ATTACH",
      ["ibmz-observability"],
      "Deep monitoring for z/OS, CICS, Db2, and middleware.",
      "Monitoramento profundo para z/OS, CICS, Db2 e middleware.",
      ibmZGate,
    ),
    technology(
      "ibmz-bob",
      "IBM Build Operate Broker (BOB)",
      "ibmz-run",
      "LEAD_ATTACH",
      ["ibmz-aiops"],
      "Integrated governance and operating model.",
      "Modelo operacional e de governança integrado.",
      ibmZGate,
    ),
    technology(
      "ibmz-openshift",
      "Red Hat OpenShift",
      "ibmz-modernize",
      "LEAD_ATTACH",
      ["ibmz-app-modernization"],
      "Cloud-native foundation for modern applications and containers.",
      "Fundação cloud-native para aplicações modernas e containers.",
      ibmZGate,
    ),
    technology(
      "ibmz-api-connect",
      "IBM API Connect",
      "ibmz-modernize",
      "LEAD_ATTACH",
      ["ibmz-hybrid-integration"],
      "Secure API lifecycle and governance.",
      "Ciclo de vida e governança segura de APIs.",
      ibmZGate,
    ),
    technology(
      "ibmz-app-connect",
      "IBM App Connect",
      "ibmz-modernize",
      "LEAD_ATTACH",
      ["ibmz-hybrid-integration"],
      "Hybrid integration across applications and data.",
      "Integração híbrida entre aplicações e dados.",
      ibmZGate,
    ),
    technology(
      "ibmz-webmethods",
      "IBM webMethods",
      "ibmz-modernize",
      "OPPORTUNITY_ATTACH",
      ["ibmz-hybrid-integration"],
      "Enterprise B2B, event, and API integration.",
      "Integração empresarial B2B, eventos e APIs.",
      ibmZGate,
    ),
    technology(
      "ibmz-guardium",
      "IBM Guardium",
      "ibmz-secure",
      "OPPORTUNITY_ATTACH",
      ["ibmz-security"],
      "Sensitive-data discovery, monitoring, and protection.",
      "Descoberta, monitoramento e proteção de dados sensíveis.",
      ibmZGate,
    ),
    technology(
      "ibmz-zsecure",
      "IBM zSecure",
      "ibmz-secure",
      "OPPORTUNITY_ATTACH",
      ["ibmz-security"],
      "Security administration, compliance, and risk management.",
      "Administração de segurança, compliance e risco.",
      ibmZGate,
    ),
    technology(
      "ibmz-cyber-vault",
      "IBM Z Cyber Vault",
      "ibmz-secure",
      "EXPANSION_ATTACH",
      ["ibmz-resilience"],
      "Cyber recovery and resilience for critical workloads.",
      "Recuperação cibernética e resiliência para cargas críticas.",
      ibmZGate,
    ),
    technology(
      "ibmz-vault",
      "HashiCorp Vault",
      "ibmz-secure",
      "OPPORTUNITY_ATTACH",
      ["ibmz-security"],
      "Secrets, certificates, and privileged-access management.",
      "Gestão de segredos, certificados e acessos privilegiados.",
      ibmZGate,
    ),
    technology(
      "ibmz-concert",
      "IBM Concert",
      "ibmz-optimize",
      "EXPANSION_ATTACH",
      ["ibmz-cost"],
      "Cross-domain operational intelligence and automation.",
      "Inteligência operacional e automação entre domínios.",
      ibmZGate,
    ),
    technology(
      "ibmz-turbonomic",
      "IBM Turbonomic",
      "ibmz-optimize",
      "EXPANSION_ATTACH",
      ["ibmz-cost"],
      "Continuous application-resource optimization.",
      "Otimização contínua de recursos de aplicações.",
      ibmZGate,
    ),
  ],
  questions: [],
};
ibmZ.questions = [
  question({
    id: "ibmz-platform",
    pillar: ibmZ.key,
    journeyIds: ibmZ.journeys.map((item) => item.id),
    capabilityIds: ibmZ.capabilities.map((item) => item.id),
    title: l("IBM Z footprint", "Presença de IBM Z"),
    question: l(
      "Does the customer currently run IBM Z for business-relevant workloads?",
      "O cliente utiliza IBM Z em workloads relevantes para o negócio?",
    ),
    rationale: l(
      "This is a required gate for IBM Z-specific recommendations.",
      "Este é um gate obrigatório para recomendações específicas de IBM Z.",
    ),
    businessImpact: 100,
    keywords: ["ibm z", "z/os", "cics", "db2", "mainframe"],
    technologyIds: ibmZ.technologies.map((item) => item.id),
    mode: "gate",
  }),
  question({
    id: "ibmz-monitoring",
    pillar: ibmZ.key,
    journeyIds: ["ibmz-run"],
    capabilityIds: ["ibmz-observability"],
    title: l("Unified monitoring", "Monitoramento unificado"),
    question: l(
      "Is monitoring unified across IBM Z and distributed environments?",
      "O monitoramento é unificado entre IBM Z e ambientes distribuídos?",
    ),
    rationale: l(
      "Fragmented visibility increases detection time, MTTR, and operational risk.",
      "Visibilidade fragmentada aumenta tempo de detecção, MTTR e risco operacional.",
    ),
    businessImpact: 92,
    keywords: ["monitoring", "observability", "visibility", "mttr"],
    technologyIds: ["ibmz-instana", "ibmz-omegamon", "ibmz-zaiops"],
  }),
  question({
    id: "ibmz-incidents",
    pillar: ibmZ.key,
    journeyIds: ["ibmz-run"],
    capabilityIds: ["ibmz-aiops"],
    title: l("Incident intelligence", "Inteligência de incidentes"),
    question: l(
      "Are events correlated and root-cause analysis automated across platforms?",
      "Os eventos são correlacionados e a análise de causa raiz é automatizada entre plataformas?",
    ),
    rationale: l(
      "Manual correlation creates alert noise and slows incident resolution.",
      "Correlação manual gera ruído de alertas e retarda a resolução de incidentes.",
    ),
    businessImpact: 90,
    keywords: ["incident", "event", "root cause", "aiops", "alert noise"],
    technologyIds: ["ibmz-zaiops", "ibmz-bob", "ibmz-concert"],
  }),
  question({
    id: "ibmz-modernization",
    pillar: ibmZ.key,
    journeyIds: ["ibmz-modernize"],
    capabilityIds: ["ibmz-hybrid-integration", "ibmz-app-modernization"],
    title: l("Modernization demand", "Demanda de modernização"),
    question: l(
      "Is there an active need to expose IBM Z capabilities, modernize applications, or integrate them with hybrid cloud?",
      "Existe necessidade ativa de expor capacidades do IBM Z, modernizar aplicações ou integrá-las à nuvem híbrida?",
    ),
    rationale: l(
      "A confirmed transformation motion activates modernization and integration technologies.",
      "Uma transformação confirmada ativa tecnologias de modernização e integração.",
    ),
    businessImpact: 94,
    keywords: ["modernization", "api", "integration", "openshift", "hybrid"],
    technologyIds: [
      "ibmz-openshift",
      "ibmz-api-connect",
      "ibmz-app-connect",
      "ibmz-webmethods",
      "ibmz-bob",
    ],
    mode: "opportunity-on-yes",
  }),
  question({
    id: "ibmz-security",
    pillar: ibmZ.key,
    journeyIds: ["ibmz-secure"],
    capabilityIds: ["ibmz-security", "ibmz-resilience"],
    title: l(
      "Privileged access and recovery",
      "Acesso privilegiado e recuperação",
    ),
    question: l(
      "Are privileged access, sensitive data, and cyber recovery consistently protected and tested?",
      "Acessos privilegiados, dados sensíveis e recuperação cibernética são protegidos e testados de forma consistente?",
    ),
    rationale: l(
      "Control and recovery gaps can block modernization and create material business risk.",
      "Lacunas de controle e recuperação podem bloquear a modernização e criar risco relevante.",
    ),
    businessImpact: 98,
    keywords: [
      "privileged",
      "sensitive data",
      "cyber recovery",
      "mfa",
      "vault",
    ],
    technologyIds: [
      "ibmz-guardium",
      "ibmz-zsecure",
      "ibmz-cyber-vault",
      "ibmz-vault",
    ],
  }),
  question({
    id: "ibmz-optimization",
    pillar: ibmZ.key,
    journeyIds: ["ibmz-optimize"],
    capabilityIds: ["ibmz-cost"],
    title: l(
      "Capacity and cost intelligence",
      "Inteligência de capacidade e custos",
    ),
    question: l(
      "Are capacity, performance, and cost optimized continuously with shared business metrics?",
      "Capacidade, performance e custos são otimizados continuamente com métricas compartilhadas de negócio?",
    ),
    rationale: l(
      "Continuous optimization connects technical efficiency to financial outcomes.",
      "Otimização contínua conecta eficiência técnica a resultados financeiros.",
    ),
    businessImpact: 82,
    keywords: ["capacity", "cost", "optimization", "performance"],
    technologyIds: ["ibmz-turbonomic", "ibmz-concert"],
  }),
];

const infrastructure: KyndrylPillar = {
  key: "infrastructure-modernization",
  label: l("Infrastructure Modernization", "Modernização de infraestrutura"),
  shortLabel: l("Infrastructure", "Infraestrutura"),
  description: l(
    "Build, automate, secure, and optimize a hybrid cloud foundation.",
    "Construir, automatizar, proteger e otimizar uma fundação de nuvem híbrida.",
  ),
  objective: l(
    "Create an intelligent hybrid infrastructure foundation with automation, security, observability, and financial transparency.",
    "Criar uma fundação de infraestrutura híbrida inteligente com automação, segurança, observabilidade e transparência financeira.",
  ),
  workshop: l(
    "Hybrid infrastructure modernization assessment",
    "Assessment de modernização de infraestrutura híbrida",
  ),
  outcomes: [
    l(
      "Faster provisioning and deployments",
      "Provisionamento e deployments mais rápidos",
    ),
    l("Stronger governance and standards", "Governança e padrões mais fortes"),
    l("Reduced downtime and cost", "Redução de indisponibilidade e custos"),
    l("Secure infrastructure at scale", "Infraestrutura segura em escala"),
  ],
  journeys: [
    {
      id: "infra-run",
      label: l("Run", "Operar"),
      description: l(
        "Operate hybrid infrastructure with confidence.",
        "Operar infraestrutura híbrida com confiança.",
      ),
    },
    {
      id: "infra-modernize",
      label: l("Modernize", "Modernizar"),
      description: l(
        "Build a hybrid cloud foundation.",
        "Construir uma fundação de nuvem híbrida.",
      ),
    },
    {
      id: "infra-secure",
      label: l("Secure", "Proteger"),
      description: l(
        "Protect infrastructure and identities.",
        "Proteger infraestrutura e identidades.",
      ),
    },
    {
      id: "infra-optimize",
      label: l("Optimize", "Otimizar"),
      description: l(
        "Continuously improve operations.",
        "Melhorar continuamente as operações.",
      ),
    },
  ],
  capabilities: [
    capability(
      "infra-observability",
      "Infrastructure observability",
      "Observabilidade de infraestrutura",
      "infra-run",
    ),
    capability(
      "infra-governance",
      "Service governance",
      "Governança de serviços",
      "infra-run",
    ),
    capability(
      "infra-iac",
      "Infrastructure as Code",
      "Infraestrutura como código",
      "infra-modernize",
    ),
    capability(
      "infra-automation",
      "Configuration automation",
      "Automação de configuração",
      "infra-modernize",
    ),
    capability(
      "infra-secrets",
      "Secrets and machine identity",
      "Segredos e identidade de máquinas",
      "infra-secure",
    ),
    capability(
      "infra-data-protection",
      "Data protection",
      "Proteção de dados",
      "infra-secure",
    ),
    capability(
      "infra-finops",
      "FinOps and cost transparency",
      "FinOps e transparência de custos",
      "infra-optimize",
    ),
  ],
  technologies: [
    technology(
      "infra-instana",
      "IBM Instana",
      "infra-run",
      "LEAD_ATTACH",
      ["infra-observability"],
      "Full-stack observability across hybrid infrastructure.",
      "Observabilidade full-stack em infraestrutura híbrida.",
    ),
    technology(
      "infra-bob",
      "IBM Build Operate Broker (BOB)",
      "infra-run",
      "LEAD_ATTACH",
      ["infra-governance"],
      "Integrated service governance and operating model.",
      "Governança de serviços e modelo operacional integrados.",
    ),
    technology(
      "infra-turbonomic",
      "IBM Turbonomic",
      "infra-modernize",
      "LEAD_ATTACH",
      ["infra-finops"],
      "Continuous resource and performance optimization.",
      "Otimização contínua de recursos e performance.",
    ),
    technology(
      "infra-terraform",
      "HashiCorp Terraform",
      "infra-modernize",
      "LEAD_ATTACH",
      ["infra-iac"],
      "Repeatable and governed Infrastructure as Code.",
      "Infraestrutura como código repetível e governada.",
    ),
    technology(
      "infra-ansible",
      "Red Hat Ansible",
      "infra-modernize",
      "OPPORTUNITY_ATTACH",
      ["infra-automation"],
      "Configuration, provisioning, and operational automation.",
      "Automação de configuração, provisionamento e operações.",
    ),
    technology(
      "infra-vault",
      "HashiCorp Vault",
      "infra-secure",
      "OPPORTUNITY_ATTACH",
      ["infra-secrets"],
      "Centralized secrets and machine-identity management.",
      "Gestão centralizada de segredos e identidades de máquinas.",
    ),
    technology(
      "infra-guardium",
      "IBM Guardium",
      "infra-secure",
      "OPPORTUNITY_ATTACH",
      ["infra-data-protection"],
      "Sensitive-data discovery and protection.",
      "Descoberta e proteção de dados sensíveis.",
    ),
    technology(
      "infra-concert",
      "IBM Concert",
      "infra-optimize",
      "EXPANSION_ATTACH",
      ["infra-governance"],
      "Cross-domain operational intelligence.",
      "Inteligência operacional entre domínios.",
    ),
    technology(
      "infra-apptio",
      "IBM Apptio",
      "infra-optimize",
      "EXPANSION_ATTACH",
      ["infra-finops"],
      "Technology financial management and transparency.",
      "Gestão financeira de tecnologia e transparência.",
    ),
    technology(
      "infra-cloudability",
      "IBM Cloudability",
      "infra-optimize",
      "EXPANSION_ATTACH",
      ["infra-finops"],
      "Multicloud cost visibility and allocation.",
      "Visibilidade e alocação de custos multicloud.",
    ),
  ],
  questions: [],
};
infrastructure.questions = [
  question({
    id: "infra-visibility",
    pillar: infrastructure.key,
    journeyIds: ["infra-run"],
    capabilityIds: ["infra-observability"],
    title: l("Hybrid visibility", "Visibilidade híbrida"),
    question: l(
      "Is infrastructure health and dependency visibility unified across cloud, data center, and edge?",
      "A visibilidade de saúde e dependências é unificada entre cloud, datacenter e edge?",
    ),
    rationale: l(
      "End-to-end visibility is the foundation for reliable hybrid operations.",
      "Visibilidade ponta a ponta é a base de operações híbridas confiáveis.",
    ),
    businessImpact: 90,
    keywords: ["hybrid", "visibility", "observability", "dependency"],
    technologyIds: ["infra-instana", "infra-bob"],
  }),
  question({
    id: "infra-governance",
    pillar: infrastructure.key,
    journeyIds: ["infra-run"],
    capabilityIds: ["infra-governance"],
    title: l("Operating governance", "Governança operacional"),
    question: l(
      "Are service ownership, standards, SLAs, and operational controls consistent across environments?",
      "Ownership de serviços, padrões, SLAs e controles operacionais são consistentes entre ambientes?",
    ),
    rationale: l(
      "A fragmented operating model makes automation and accountability difficult.",
      "Um modelo operacional fragmentado dificulta automação e accountability.",
    ),
    businessImpact: 84,
    keywords: ["service", "governance", "sla", "owner"],
    technologyIds: ["infra-bob", "infra-concert"],
  }),
  question({
    id: "infra-iac",
    pillar: infrastructure.key,
    journeyIds: ["infra-modernize"],
    capabilityIds: ["infra-iac"],
    title: l("Infrastructure as Code", "Infraestrutura como código"),
    question: l(
      "Is infrastructure provisioned through governed, reusable Infrastructure as Code?",
      "A infraestrutura é provisionada por código reutilizável e governado?",
    ),
    rationale: l(
      "IaC reduces drift, lead time, and inconsistent deployments.",
      "IaC reduz drift, lead time e deployments inconsistentes.",
    ),
    businessImpact: 88,
    keywords: ["iac", "terraform", "provisioning", "drift"],
    technologyIds: ["infra-terraform", "infra-ansible"],
  }),
  question({
    id: "infra-automation",
    pillar: infrastructure.key,
    journeyIds: ["infra-modernize"],
    capabilityIds: ["infra-automation"],
    title: l("Operational automation", "Automação operacional"),
    question: l(
      "Are configuration, patching, and routine operational changes automated and standardized?",
      "Configuração, patches e mudanças operacionais rotineiras são automatizadas e padronizadas?",
    ),
    rationale: l(
      "Manual changes increase toil, errors, and operational risk.",
      "Mudanças manuais aumentam esforço, erros e risco operacional.",
    ),
    businessImpact: 86,
    keywords: ["automation", "patch", "configuration", "manual"],
    technologyIds: ["infra-ansible", "infra-bob"],
  }),
  question({
    id: "infra-security",
    pillar: infrastructure.key,
    journeyIds: ["infra-secure"],
    capabilityIds: ["infra-secrets", "infra-data-protection"],
    title: l("Secrets and data protection", "Segredos e proteção de dados"),
    question: l(
      "Are secrets, machine identities, and sensitive infrastructure data centrally governed and audited?",
      "Segredos, identidades de máquinas e dados sensíveis de infraestrutura são governados e auditados centralmente?",
    ),
    rationale: l(
      "Distributed secrets and unclassified data create preventable security exposure.",
      "Segredos distribuídos e dados sem classificação criam exposição evitável.",
    ),
    businessImpact: 96,
    keywords: ["secrets", "identity", "data protection", "audit"],
    technologyIds: ["infra-vault", "infra-guardium"],
  }),
  question({
    id: "infra-finops",
    pillar: infrastructure.key,
    journeyIds: ["infra-optimize"],
    capabilityIds: ["infra-finops"],
    title: l(
      "Cost and capacity transparency",
      "Transparência de custos e capacidade",
    ),
    question: l(
      "Are multicloud cost, allocation, capacity, and optimization decisions visible to both finance and technology?",
      "Custos multicloud, alocação, capacidade e decisões de otimização são visíveis para finanças e tecnologia?",
    ),
    rationale: l(
      "Shared financial and technical visibility supports sustainable optimization.",
      "Visibilidade financeira e técnica compartilhada sustenta otimização contínua.",
    ),
    businessImpact: 82,
    keywords: ["cost", "capacity", "allocation", "finops"],
    technologyIds: [
      "infra-apptio",
      "infra-cloudability",
      "infra-turbonomic",
      "infra-concert",
    ],
  }),
];

const applications: KyndrylPillar = {
  key: "application-modernization",
  label: l("Application Modernization", "Modernização de aplicações"),
  shortLabel: l("Applications", "Aplicações"),
  description: l(
    "Build, integrate, observe, govern, secure, and scale modern applications.",
    "Construir, integrar, observar, governar, proteger e escalar aplicações modernas.",
  ),
  objective: l(
    "Modernize enterprise applications through cloud-native platforms, API-led integration, automation, security, and observability.",
    "Modernizar aplicações empresariais por plataformas cloud-native, integração orientada a APIs, automação, segurança e observabilidade.",
  ),
  workshop: l(
    "Application modernization opportunity assessment",
    "Assessment de oportunidades de modernização de aplicações",
  ),
  outcomes: [
    l("Faster time to market", "Menor time-to-market"),
    l("Reliable cloud-native delivery", "Entrega cloud-native confiável"),
    l(
      "API economy and hybrid integration",
      "Economia de APIs e integração híbrida",
    ),
    l("Lower application risk and cost", "Menor risco e custo de aplicações"),
  ],
  journeys: [
    {
      id: "app-build",
      label: l("Build", "Construir"),
      description: l(
        "Accelerate application development.",
        "Acelerar desenvolvimento de aplicações.",
      ),
    },
    {
      id: "app-integrate",
      label: l("Integrate", "Integrar"),
      description: l(
        "Connect applications, APIs, and data.",
        "Conectar aplicações, APIs e dados.",
      ),
    },
    {
      id: "app-observe",
      label: l("Observe", "Observar"),
      description: l(
        "Improve reliability and experience.",
        "Melhorar confiabilidade e experiência.",
      ),
    },
    {
      id: "app-govern",
      label: l("Govern and secure", "Governar e proteger"),
      description: l(
        "Protect applications and data.",
        "Proteger aplicações e dados.",
      ),
    },
    {
      id: "app-optimize",
      label: l("Optimize and scale", "Otimizar e escalar"),
      description: l(
        "Continuously improve applications.",
        "Melhorar aplicações continuamente.",
      ),
    },
  ],
  capabilities: [
    capability(
      "app-platform",
      "Cloud-native application platform",
      "Plataforma de aplicações cloud-native",
      "app-build",
    ),
    capability(
      "app-delivery",
      "Automated delivery",
      "Entrega automatizada",
      "app-build",
    ),
    capability(
      "app-api",
      "API management and integration",
      "Gestão de APIs e integração",
      "app-integrate",
    ),
    capability(
      "app-observability",
      "Application observability",
      "Observabilidade de aplicações",
      "app-observe",
    ),
    capability(
      "app-security",
      "Application and data security",
      "Segurança de aplicações e dados",
      "app-govern",
    ),
    capability(
      "app-optimization",
      "Application portfolio optimization",
      "Otimização do portfólio de aplicações",
      "app-optimize",
    ),
  ],
  technologies: [
    technology(
      "app-openshift",
      "Red Hat OpenShift",
      "app-build",
      "LEAD_ATTACH",
      ["app-platform"],
      "Cloud-native platform for building and scaling applications.",
      "Plataforma cloud-native para construir e escalar aplicações.",
    ),
    technology(
      "app-bob",
      "IBM Build Operate Broker (BOB)",
      "app-build",
      "LEAD_ATTACH",
      ["app-delivery"],
      "Governed build and operate model.",
      "Modelo governado de build e operação.",
    ),
    technology(
      "app-api-connect",
      "IBM API Connect",
      "app-integrate",
      "LEAD_ATTACH",
      ["app-api"],
      "Secure API lifecycle and monetization.",
      "Ciclo de vida seguro e monetização de APIs.",
    ),
    technology(
      "app-app-connect",
      "IBM App Connect",
      "app-integrate",
      "LEAD_ATTACH",
      ["app-api"],
      "Hybrid application and data integration.",
      "Integração híbrida de aplicações e dados.",
    ),
    technology(
      "app-webmethods",
      "IBM webMethods",
      "app-integrate",
      "OPPORTUNITY_ATTACH",
      ["app-api"],
      "Enterprise B2B, event, and API integration.",
      "Integração empresarial B2B, eventos e APIs.",
    ),
    technology(
      "app-instana",
      "IBM Instana",
      "app-observe",
      "LEAD_ATTACH",
      ["app-observability"],
      "Full-stack application observability.",
      "Observabilidade full-stack de aplicações.",
    ),
    technology(
      "app-turbonomic",
      "IBM Turbonomic",
      "app-observe",
      "LEAD_ATTACH",
      ["app-optimization"],
      "Application-resource optimization.",
      "Otimização de recursos de aplicações.",
    ),
    technology(
      "app-guardium",
      "IBM Guardium",
      "app-govern",
      "OPPORTUNITY_ATTACH",
      ["app-security"],
      "Sensitive-data protection and monitoring.",
      "Proteção e monitoramento de dados sensíveis.",
    ),
    technology(
      "app-vault",
      "HashiCorp Vault",
      "app-govern",
      "OPPORTUNITY_ATTACH",
      ["app-security"],
      "Application secrets and certificates.",
      "Segredos e certificados de aplicações.",
    ),
    technology(
      "app-concert",
      "IBM Concert",
      "app-optimize",
      "EXPANSION_ATTACH",
      ["app-optimization"],
      "Cross-domain application intelligence.",
      "Inteligência de aplicações entre domínios.",
    ),
    technology(
      "app-apptio",
      "IBM Apptio",
      "app-optimize",
      "EXPANSION_ATTACH",
      ["app-optimization"],
      "Application portfolio and financial transparency.",
      "Transparência financeira e de portfólio de aplicações.",
    ),
  ],
  questions: [],
};
applications.questions = [
  question({
    id: "app-platform",
    pillar: applications.key,
    journeyIds: ["app-build"],
    capabilityIds: ["app-platform"],
    title: l("Cloud-native platform", "Plataforma cloud-native"),
    question: l(
      "Is there a standardized cloud-native platform for building and running strategic applications?",
      "Existe uma plataforma cloud-native padronizada para construir e executar aplicações estratégicas?",
    ),
    rationale: l(
      "A common platform reduces delivery friction and platform inconsistency.",
      "Uma plataforma comum reduz fricção de entrega e inconsistência.",
    ),
    businessImpact: 92,
    keywords: ["cloud native", "platform", "container", "openshift"],
    technologyIds: ["app-openshift", "app-bob"],
  }),
  question({
    id: "app-delivery",
    pillar: applications.key,
    journeyIds: ["app-build"],
    capabilityIds: ["app-delivery"],
    title: l("Delivery automation", "Automação de entrega"),
    question: l(
      "Are build, deployment, governance, and operational controls automated across application teams?",
      "Build, deployment, governança e controles operacionais são automatizados entre os times de aplicação?",
    ),
    rationale: l(
      "Inconsistent delivery creates risk, rework, and long lead times.",
      "Entrega inconsistente cria risco, retrabalho e lead times longos.",
    ),
    businessImpact: 88,
    keywords: ["deployment", "devops", "governance", "automation"],
    technologyIds: ["app-bob", "app-openshift"],
  }),
  question({
    id: "app-integration",
    pillar: applications.key,
    journeyIds: ["app-integrate"],
    capabilityIds: ["app-api"],
    title: l("API and integration economy", "Economia de APIs e integração"),
    question: l(
      "Are APIs and integrations governed, reusable, discoverable, and secure across the enterprise?",
      "APIs e integrações são governadas, reutilizáveis, descobríveis e seguras em toda a empresa?",
    ),
    rationale: l(
      "Fragmented integration limits reuse and slows digital initiatives.",
      "Integração fragmentada limita reuso e desacelera iniciativas digitais.",
    ),
    businessImpact: 90,
    keywords: ["api", "integration", "event", "b2b"],
    technologyIds: ["app-api-connect", "app-app-connect", "app-webmethods"],
  }),
  question({
    id: "app-observability",
    pillar: applications.key,
    journeyIds: ["app-observe"],
    capabilityIds: ["app-observability"],
    title: l("Application reliability", "Confiabilidade de aplicações"),
    question: l(
      "Do teams have end-to-end observability, SRE practices, and rapid root-cause analysis?",
      "Os times possuem observabilidade ponta a ponta, práticas SRE e análise rápida de causa raiz?",
    ),
    rationale: l(
      "Reliability evidence is required to modernize without increasing operational risk.",
      "Evidências de confiabilidade são necessárias para modernizar sem ampliar risco operacional.",
    ),
    businessImpact: 94,
    keywords: ["observability", "sre", "root cause", "experience"],
    technologyIds: ["app-instana", "app-turbonomic"],
  }),
  question({
    id: "app-security",
    pillar: applications.key,
    journeyIds: ["app-govern"],
    capabilityIds: ["app-security"],
    title: l("Application security", "Segurança de aplicações"),
    question: l(
      "Are application secrets, certificates, and sensitive data protected throughout the lifecycle?",
      "Segredos, certificados e dados sensíveis das aplicações são protegidos durante todo o ciclo de vida?",
    ),
    rationale: l(
      "Security gaps create release blockers and compliance exposure.",
      "Lacunas de segurança criam bloqueios de release e exposição de compliance.",
    ),
    businessImpact: 96,
    keywords: ["secret", "certificate", "sensitive data", "security"],
    technologyIds: ["app-vault", "app-guardium"],
  }),
  question({
    id: "app-portfolio",
    pillar: applications.key,
    journeyIds: ["app-optimize"],
    capabilityIds: ["app-optimization"],
    title: l("Portfolio intelligence", "Inteligência de portfólio"),
    question: l(
      "Are application value, cost, risk, performance, and modernization decisions managed together?",
      "Valor, custo, risco, performance e decisões de modernização das aplicações são gerenciados em conjunto?",
    ),
    rationale: l(
      "Portfolio intelligence prioritizes modernization based on business value.",
      "Inteligência de portfólio prioriza modernização com base em valor de negócio.",
    ),
    businessImpact: 84,
    keywords: ["portfolio", "cost", "risk", "modernization"],
    technologyIds: ["app-concert", "app-apptio", "app-turbonomic"],
  }),
];

const sap: KyndrylPillar = {
  key: "sap-transformation",
  label: l("SAP Transformation", "Transformação SAP"),
  shortLabel: l("SAP", "SAP"),
  description: l(
    "Transform, integrate, operate, secure, and optimize SAP.",
    "Transformar, integrar, operar, proteger e otimizar SAP.",
  ),
  objective: l(
    "Accelerate SAP outcomes through S/4HANA modernization, Clean Core, enterprise integration, intelligent operations, and continuous optimization.",
    "Acelerar resultados SAP por modernização S/4HANA, Clean Core, integração empresarial, operações inteligentes e otimização contínua.",
  ),
  workshop: l(
    "SAP transformation opportunity assessment",
    "Assessment de oportunidades de transformação SAP",
  ),
  outcomes: [
    l(
      "Faster S/4HANA and Clean Core adoption",
      "Adoção mais rápida de S/4HANA e Clean Core",
    ),
    l(
      "Integrated SAP and enterprise ecosystem",
      "Ecossistema SAP e empresarial integrado",
    ),
    l(
      "Reliable and secure SAP operations",
      "Operações SAP confiáveis e seguras",
    ),
    l(
      "Performance and cost optimization",
      "Otimização de performance e custos",
    ),
  ],
  journeys: [
    {
      id: "sap-transform",
      label: l("Transform", "Transformar"),
      description: l(
        "Modernize SAP business processes.",
        "Modernizar processos de negócio SAP.",
      ),
    },
    {
      id: "sap-integrate",
      label: l("Integrate", "Integrar"),
      description: l(
        "Connect SAP to the enterprise.",
        "Conectar SAP à empresa.",
      ),
    },
    {
      id: "sap-operate",
      label: l("Operate", "Operar"),
      description: l("Run SAP with confidence.", "Operar SAP com confiança."),
    },
    {
      id: "sap-secure",
      label: l("Secure", "Proteger"),
      description: l(
        "Protect critical SAP processes.",
        "Proteger processos SAP críticos.",
      ),
    },
    {
      id: "sap-optimize",
      label: l("Optimize", "Otimizar"),
      description: l(
        "Continuously improve SAP.",
        "Melhorar SAP continuamente.",
      ),
    },
  ],
  capabilities: [
    capability(
      "sap-transformation",
      "S/4HANA and Clean Core transformation",
      "Transformação S/4HANA e Clean Core",
      "sap-transform",
    ),
    capability(
      "sap-integration",
      "SAP enterprise integration",
      "Integração empresarial SAP",
      "sap-integrate",
    ),
    capability(
      "sap-observability",
      "SAP observability",
      "Observabilidade SAP",
      "sap-operate",
    ),
    capability(
      "sap-security",
      "SAP data and identity protection",
      "Proteção de dados e identidade SAP",
      "sap-secure",
    ),
    capability(
      "sap-finops",
      "SAP performance and FinOps",
      "Performance e FinOps para SAP",
      "sap-optimize",
    ),
  ],
  technologies: [
    technology(
      "sap-bob",
      "IBM Build Operate Broker (BOB)",
      "sap-transform",
      "LEAD_ATTACH",
      ["sap-transformation"],
      "Governed SAP transformation operating model.",
      "Modelo operacional governado para transformação SAP.",
    ),
    technology(
      "sap-app-connect",
      "IBM App Connect",
      "sap-integrate",
      "LEAD_ATTACH",
      ["sap-integration"],
      "Connect SAP with applications, APIs, and cloud.",
      "Conectar SAP a aplicações, APIs e cloud.",
    ),
    technology(
      "sap-api-connect",
      "IBM API Connect",
      "sap-integrate",
      "OPPORTUNITY_ATTACH",
      ["sap-integration"],
      "Secure API management for SAP services.",
      "Gestão segura de APIs para serviços SAP.",
    ),
    technology(
      "sap-webmethods",
      "IBM webMethods",
      "sap-integrate",
      "OPPORTUNITY_ATTACH",
      ["sap-integration"],
      "Enterprise B2B and event integration.",
      "Integração empresarial B2B e de eventos.",
    ),
    technology(
      "sap-instana",
      "IBM Instana",
      "sap-operate",
      "LEAD_ATTACH",
      ["sap-observability"],
      "Full-stack SAP and hybrid observability.",
      "Observabilidade full-stack de SAP e ambiente híbrido.",
    ),
    technology(
      "sap-concert",
      "IBM Concert",
      "sap-operate",
      "OPPORTUNITY_ATTACH",
      ["sap-observability"],
      "AI-powered SAP operational intelligence.",
      "Inteligência operacional SAP orientada por IA.",
    ),
    technology(
      "sap-guardium",
      "IBM Guardium",
      "sap-secure",
      "OPPORTUNITY_ATTACH",
      ["sap-security"],
      "Sensitive SAP data protection.",
      "Proteção de dados SAP sensíveis.",
    ),
    technology(
      "sap-verify",
      "IBM Verify",
      "sap-secure",
      "OPPORTUNITY_ATTACH",
      ["sap-security"],
      "Identity and access management for SAP.",
      "Gestão de identidade e acesso para SAP.",
    ),
    technology(
      "sap-turbonomic",
      "IBM Turbonomic",
      "sap-optimize",
      "EXPANSION_ATTACH",
      ["sap-finops"],
      "Continuous SAP performance and capacity optimization.",
      "Otimização contínua de performance e capacidade SAP.",
    ),
    technology(
      "sap-apptio",
      "IBM Apptio",
      "sap-optimize",
      "EXPANSION_ATTACH",
      ["sap-finops"],
      "SAP cost transparency and financial management.",
      "Transparência de custos e gestão financeira SAP.",
    ),
  ],
  questions: [],
};
sap.questions = [
  question({
    id: "sap-roadmap",
    pillar: sap.key,
    journeyIds: ["sap-transform"],
    capabilityIds: ["sap-transformation"],
    title: l("S/4HANA transformation", "Transformação S/4HANA"),
    question: l(
      "Is there an active S/4HANA, Clean Core, RISE, or SAP BTP transformation initiative?",
      "Existe uma iniciativa ativa de S/4HANA, Clean Core, RISE ou SAP BTP?",
    ),
    rationale: l(
      "An active transformation is the primary gate for a SAP modernization motion.",
      "Uma transformação ativa é o principal sinal para uma frente de modernização SAP.",
    ),
    businessImpact: 98,
    keywords: ["s4hana", "clean core", "rise", "btp"],
    technologyIds: ["sap-bob"],
    mode: "opportunity-on-yes",
  }),
  question({
    id: "sap-integration",
    pillar: sap.key,
    journeyIds: ["sap-integrate"],
    capabilityIds: ["sap-integration"],
    title: l("SAP integration", "Integração SAP"),
    question: l(
      "Are SAP integrations standardized, governed, reusable, and visible across cloud and on-premises systems?",
      "As integrações SAP são padronizadas, governadas, reutilizáveis e visíveis entre cloud e on-premises?",
    ),
    rationale: l(
      "Point-to-point integration increases migration risk and slows business change.",
      "Integrações ponto a ponto aumentam risco de migração e desaceleram mudanças.",
    ),
    businessImpact: 92,
    keywords: ["sap integration", "api", "b2b", "event"],
    technologyIds: ["sap-app-connect", "sap-api-connect", "sap-webmethods"],
  }),
  question({
    id: "sap-observability",
    pillar: sap.key,
    journeyIds: ["sap-operate"],
    capabilityIds: ["sap-observability"],
    title: l("SAP operations", "Operações SAP"),
    question: l(
      "Is SAP performance and user experience observed end to end with rapid root-cause analysis?",
      "Performance e experiência do usuário SAP são observadas ponta a ponta com análise rápida de causa raiz?",
    ),
    rationale: l(
      "SAP business continuity depends on application and infrastructure visibility.",
      "Continuidade de negócio SAP depende de visibilidade de aplicação e infraestrutura.",
    ),
    businessImpact: 96,
    keywords: ["sap performance", "user experience", "root cause"],
    technologyIds: ["sap-instana", "sap-concert"],
  }),
  question({
    id: "sap-security",
    pillar: sap.key,
    journeyIds: ["sap-secure"],
    capabilityIds: ["sap-security"],
    title: l("SAP data and identity", "Dados e identidade SAP"),
    question: l(
      "Are sensitive SAP data, privileged access, and user identities continuously governed and audited?",
      "Dados SAP sensíveis, acessos privilegiados e identidades são governados e auditados continuamente?",
    ),
    rationale: l(
      "Identity and data-control gaps create audit and business-process risk.",
      "Lacunas de identidade e controle de dados criam risco de auditoria e de processos.",
    ),
    businessImpact: 98,
    keywords: ["sap security", "identity", "privileged", "data"],
    technologyIds: ["sap-guardium", "sap-verify"],
  }),
  question({
    id: "sap-performance",
    pillar: sap.key,
    journeyIds: ["sap-optimize"],
    capabilityIds: ["sap-finops"],
    title: l("SAP capacity", "Capacidade SAP"),
    question: l(
      "Are SAP application and infrastructure resources optimized continuously against performance demand?",
      "Recursos de aplicação e infraestrutura SAP são otimizados continuamente conforme a demanda de performance?",
    ),
    rationale: l(
      "Continuous optimization protects performance while reducing overprovisioning.",
      "Otimização contínua protege performance e reduz superdimensionamento.",
    ),
    businessImpact: 88,
    keywords: ["capacity", "rightsizing", "performance"],
    technologyIds: ["sap-turbonomic"],
  }),
  question({
    id: "sap-cost",
    pillar: sap.key,
    journeyIds: ["sap-optimize"],
    capabilityIds: ["sap-finops"],
    title: l("SAP cost transparency", "Transparência de custos SAP"),
    question: l(
      "Are SAP transformation, run, cloud, and licensing costs transparent to business and technology leaders?",
      "Custos de transformação, operação, cloud e licenças SAP são transparentes para líderes de negócio e tecnologia?",
    ),
    rationale: l(
      "Financial transparency supports investment decisions and ongoing optimization.",
      "Transparência financeira sustenta decisões de investimento e otimização contínua.",
    ),
    businessImpact: 84,
    keywords: ["sap cost", "license", "tco", "finops"],
    technologyIds: ["sap-apptio", "sap-turbonomic"],
  }),
];

const modernOperations: KyndrylPillar = {
  key: "modern-operations",
  label: l("Modern Operations", "Operações modernas"),
  shortLabel: l("Operations", "Operações"),
  description: l(
    "Operate, observe, automate, optimize, and predict across IT operations.",
    "Operar, observar, automatizar, otimizar e prever em toda a operação de TI.",
  ),
  objective: l(
    "Transform traditional IT operations into intelligent operations powered by observability, AIOps, automation, and operational intelligence.",
    "Transformar operações tradicionais de TI em operações inteligentes com observabilidade, AIOps, automação e inteligência operacional.",
  ),
  workshop: l(
    "Modern operations maturity assessment",
    "Assessment de maturidade de operações modernas",
  ),
  outcomes: [
    l("Lower MTTR and incident volume", "Menor MTTR e volume de incidentes"),
    l(
      "Automated remediation and self-healing",
      "Remediação automatizada e self-healing",
    ),
    l("Optimized resources and costs", "Recursos e custos otimizados"),
    l("Predictive operations", "Operações preditivas"),
  ],
  journeys: [
    {
      id: "ops-run",
      label: l("Run", "Operar"),
      description: l(
        "Establish operational governance.",
        "Estabelecer governança operacional.",
      ),
    },
    {
      id: "ops-observe",
      label: l("Observe", "Observar"),
      description: l(
        "Gain full operational visibility.",
        "Obter visibilidade operacional completa.",
      ),
    },
    {
      id: "ops-automate",
      label: l("Automate", "Automatizar"),
      description: l("Reduce manual operations.", "Reduzir operações manuais."),
    },
    {
      id: "ops-optimize",
      label: l("Optimize", "Otimizar"),
      description: l(
        "Improve efficiency and cost.",
        "Melhorar eficiência e custos.",
      ),
    },
    {
      id: "ops-predict",
      label: l("Predict", "Prever"),
      description: l(
        "Create intelligent operations.",
        "Criar operações inteligentes.",
      ),
    },
  ],
  capabilities: [
    capability(
      "ops-governance",
      "Service governance",
      "Governança de serviços",
      "ops-run",
    ),
    capability(
      "ops-observability",
      "Full-stack and network observability",
      "Observabilidade full-stack e de rede",
      "ops-observe",
    ),
    capability(
      "ops-aiops",
      "AIOps and automated remediation",
      "AIOps e remediação automatizada",
      "ops-automate",
    ),
    capability(
      "ops-finops",
      "Performance and cost optimization",
      "Otimização de performance e custos",
      "ops-optimize",
    ),
    capability(
      "ops-intelligence",
      "Predictive operational intelligence",
      "Inteligência operacional preditiva",
      "ops-predict",
    ),
  ],
  technologies: [
    technology(
      "ops-bob",
      "IBM Build Operate Broker (BOB)",
      "ops-run",
      "LEAD_ATTACH",
      ["ops-governance"],
      "Integrated governance and service operations.",
      "Governança e operações de serviço integradas.",
    ),
    technology(
      "ops-instana",
      "IBM Instana",
      "ops-observe",
      "LEAD_ATTACH",
      ["ops-observability"],
      "Application and infrastructure observability.",
      "Observabilidade de aplicações e infraestrutura.",
    ),
    technology(
      "ops-sevone",
      "IBM SevOne",
      "ops-observe",
      "LEAD_ATTACH",
      ["ops-observability"],
      "Network performance and visibility.",
      "Performance e visibilidade de rede.",
    ),
    technology(
      "ops-aiops",
      "IBM Cloud Pak for AIOps",
      "ops-automate",
      "LEAD_ATTACH",
      ["ops-aiops"],
      "AI-powered event correlation and remediation.",
      "Correlação de eventos e remediação orientadas por IA.",
    ),
    technology(
      "ops-ansible",
      "Red Hat Ansible",
      "ops-automate",
      "OPPORTUNITY_ATTACH",
      ["ops-aiops"],
      "Infrastructure and application automation.",
      "Automação de infraestrutura e aplicações.",
    ),
    technology(
      "ops-turbonomic",
      "IBM Turbonomic",
      "ops-optimize",
      "LEAD_ATTACH",
      ["ops-finops"],
      "Continuous resource optimization.",
      "Otimização contínua de recursos.",
    ),
    technology(
      "ops-apptio",
      "IBM Apptio",
      "ops-optimize",
      "EXPANSION_ATTACH",
      ["ops-finops"],
      "IT financial management and FinOps.",
      "Gestão financeira de TI e FinOps.",
    ),
    technology(
      "ops-concert",
      "IBM Concert",
      "ops-predict",
      "OPPORTUNITY_ATTACH",
      ["ops-intelligence"],
      "Cross-domain predictive operational intelligence.",
      "Inteligência operacional preditiva entre domínios.",
    ),
  ],
  questions: [],
};
modernOperations.questions = [
  question({
    id: "ops-governance",
    pillar: modernOperations.key,
    journeyIds: ["ops-run"],
    capabilityIds: ["ops-governance"],
    title: l("Operating model", "Modelo operacional"),
    question: l(
      "Are service ownership, operating procedures, and governance consistent across IT domains?",
      "Ownership de serviços, procedimentos operacionais e governança são consistentes entre domínios de TI?",
    ),
    rationale: l(
      "A consistent operating model is required before automation can scale.",
      "Um modelo operacional consistente é necessário para escalar automação.",
    ),
    businessImpact: 82,
    keywords: ["operating model", "service", "governance"],
    technologyIds: ["ops-bob", "ops-concert"],
  }),
  question({
    id: "ops-observability",
    pillar: modernOperations.key,
    journeyIds: ["ops-observe"],
    capabilityIds: ["ops-observability"],
    title: l("Operational visibility", "Visibilidade operacional"),
    question: l(
      "Is application, infrastructure, and network observability unified end to end?",
      "A observabilidade de aplicações, infraestrutura e rede é unificada ponta a ponta?",
    ),
    rationale: l(
      "Siloed tools hide dependencies and increase detection time.",
      "Ferramentas em silos ocultam dependências e aumentam tempo de detecção.",
    ),
    businessImpact: 94,
    keywords: ["observability", "network", "visibility"],
    technologyIds: ["ops-instana", "ops-sevone"],
  }),
  question({
    id: "ops-automation",
    pillar: modernOperations.key,
    journeyIds: ["ops-automate"],
    capabilityIds: ["ops-aiops"],
    title: l("Event correlation and remediation", "Correlação e remediação"),
    question: l(
      "Are events correlated automatically and are repeatable incidents remediated through runbooks?",
      "Eventos são correlacionados automaticamente e incidentes repetitivos são remediados por runbooks?",
    ),
    rationale: l(
      "Automation reduces alert noise, manual effort, and MTTR.",
      "Automação reduz ruído de alertas, esforço manual e MTTR.",
    ),
    businessImpact: 96,
    keywords: ["event correlation", "runbook", "remediation", "mttr"],
    technologyIds: ["ops-aiops", "ops-ansible"],
  }),
  question({
    id: "ops-impact",
    pillar: modernOperations.key,
    journeyIds: ["ops-observe", "ops-automate"],
    capabilityIds: ["ops-observability", "ops-aiops"],
    title: l("Operational pain", "Dor operacional"),
    question: l(
      "Are alert noise, outages, manual root-cause analysis, or high MTTR materially affecting the business?",
      "Ruído de alertas, indisponibilidades, análise manual de causa raiz ou MTTR alto afetam materialmente o negócio?",
    ),
    rationale: l(
      "Material operational pain increases urgency and expected business value.",
      "Dor operacional material aumenta urgência e valor de negócio esperado.",
    ),
    businessImpact: 100,
    keywords: ["outage", "mttr", "alert noise", "root cause"],
    technologyIds: ["ops-instana", "ops-sevone", "ops-aiops", "ops-ansible"],
    mode: "opportunity-on-yes",
  }),
  question({
    id: "ops-optimization",
    pillar: modernOperations.key,
    journeyIds: ["ops-optimize"],
    capabilityIds: ["ops-finops"],
    title: l("Resource optimization", "Otimização de recursos"),
    question: l(
      "Are application and infrastructure resources optimized continuously against performance and cost?",
      "Recursos de aplicações e infraestrutura são otimizados continuamente em relação a performance e custos?",
    ),
    rationale: l(
      "Continuous optimization balances user experience, risk, and spend.",
      "Otimização contínua equilibra experiência, risco e gastos.",
    ),
    businessImpact: 86,
    keywords: ["resource", "performance", "cost", "optimization"],
    technologyIds: ["ops-turbonomic", "ops-apptio"],
  }),
  question({
    id: "ops-predictive",
    pillar: modernOperations.key,
    journeyIds: ["ops-predict"],
    capabilityIds: ["ops-intelligence"],
    title: l("Predictive operations", "Operações preditivas"),
    question: l(
      "Are cross-domain operational signals used to predict risks and coordinate actions proactively?",
      "Sinais operacionais entre domínios são usados para prever riscos e coordenar ações proativamente?",
    ),
    rationale: l(
      "Predictive intelligence moves operations from reaction to prevention.",
      "Inteligência preditiva move a operação da reação para a prevenção.",
    ),
    businessImpact: 80,
    keywords: ["predictive", "risk", "cross domain", "proactive"],
    technologyIds: ["ops-concert", "ops-aiops"],
  }),
];

const dataAi: KyndrylPillar = {
  key: "data-ai",
  label: l("Data Platform & AI", "Plataforma de dados e IA"),
  shortLabel: l("Data & AI", "Dados e IA"),
  description: l(
    "Govern, integrate, stream, innovate, and scale trusted data and AI.",
    "Governar, integrar, transmitir, inovar e escalar dados e IA confiáveis.",
  ),
  objective: l(
    "Build trusted data platforms for analytics, real-time intelligence, generative AI, and agentic AI at enterprise scale.",
    "Construir plataformas confiáveis de dados para analytics, inteligência em tempo real, IA generativa e IA agêntica em escala empresarial.",
  ),
  workshop: l(
    "Data and AI opportunity assessment",
    "Assessment de oportunidades de dados e IA",
  ),
  outcomes: [
    l("Trusted, governed data", "Dados confiáveis e governados"),
    l(
      "Enterprise data integration and streaming",
      "Integração e streaming de dados empresariais",
    ),
    l(
      "Scalable generative and agentic AI",
      "IA generativa e agêntica escalável",
    ),
    l(
      "Operational intelligence and forecasting",
      "Inteligência operacional e forecasting",
    ),
  ],
  journeys: [
    {
      id: "data-govern",
      label: l("Govern", "Governar"),
      description: l(
        "Establish a trusted data foundation.",
        "Estabelecer uma fundação de dados confiável.",
      ),
    },
    {
      id: "data-integrate",
      label: l("Integrate", "Integrar"),
      description: l(
        "Build the enterprise data fabric.",
        "Construir o data fabric empresarial.",
      ),
    },
    {
      id: "data-stream",
      label: l("Stream", "Transmitir"),
      description: l(
        "Enable real-time data intelligence.",
        "Habilitar inteligência de dados em tempo real.",
      ),
    },
    {
      id: "data-innovate",
      label: l("Innovate", "Inovar"),
      description: l(
        "Accelerate generative and agentic AI.",
        "Acelerar IA generativa e agêntica.",
      ),
    },
    {
      id: "data-scale",
      label: l("Scale", "Escalar"),
      description: l(
        "Operationalize AI and insights.",
        "Operacionalizar IA e insights.",
      ),
    },
  ],
  capabilities: [
    capability(
      "data-governance",
      "Data and AI governance",
      "Governança de dados e IA",
      "data-govern",
    ),
    capability(
      "data-integration",
      "Enterprise data integration",
      "Integração de dados empresarial",
      "data-integrate",
    ),
    capability(
      "data-streaming",
      "Real-time event streaming",
      "Streaming de eventos em tempo real",
      "data-stream",
    ),
    capability(
      "data-genai",
      "Generative and agentic AI",
      "IA generativa e agêntica",
      "data-innovate",
    ),
    capability(
      "data-operationalize",
      "AI and business intelligence at scale",
      "IA e inteligência de negócio em escala",
      "data-scale",
    ),
  ],
  technologies: [
    technology(
      "data-knowledge-catalog",
      "IBM Knowledge Catalog",
      "data-govern",
      "LEAD_ATTACH",
      ["data-governance"],
      "Catalog, discover, and understand data assets.",
      "Catalogar, descobrir e entender ativos de dados.",
    ),
    technology(
      "data-governance-product",
      "IBM watsonx.governance",
      "data-govern",
      "OPPORTUNITY_ATTACH",
      ["data-governance"],
      "Govern AI and data risk.",
      "Governar risco de IA e dados.",
    ),
    technology(
      "data-bob",
      "IBM Build Operate Broker (BOB)",
      "data-govern",
      "OPPORTUNITY_ATTACH",
      ["data-governance"],
      "Governed data-platform operating model.",
      "Modelo operacional governado de plataforma de dados.",
    ),
    technology(
      "data-datastage",
      "IBM DataStage",
      "data-integrate",
      "LEAD_ATTACH",
      ["data-integration"],
      "Enterprise-grade data integration and transformation.",
      "Integração e transformação de dados empresarial.",
    ),
    technology(
      "data-app-connect",
      "IBM App Connect",
      "data-integrate",
      "OPPORTUNITY_ATTACH",
      ["data-integration"],
      "Application, API, and data integration.",
      "Integração de aplicações, APIs e dados.",
    ),
    technology(
      "data-webmethods",
      "IBM webMethods",
      "data-integrate",
      "OPPORTUNITY_ATTACH",
      ["data-integration"],
      "Enterprise integration and process automation.",
      "Integração empresarial e automação de processos.",
    ),
    technology(
      "data-confluent",
      "Confluent",
      "data-stream",
      "LEAD_ATTACH",
      ["data-streaming"],
      "Enterprise real-time data streaming.",
      "Streaming empresarial de dados em tempo real.",
    ),
    technology(
      "data-kafka",
      "Apache Kafka Platform",
      "data-stream",
      "LEAD_ATTACH",
      ["data-streaming"],
      "Event-driven architecture and analytics.",
      "Arquitetura orientada a eventos e analytics.",
    ),
    technology(
      "data-watsonx-ai",
      "IBM watsonx.ai",
      "data-innovate",
      "LEAD_ATTACH",
      ["data-genai"],
      "Build, tune, and deploy AI applications and agents.",
      "Construir, ajustar e implantar aplicações e agentes de IA.",
    ),
    technology(
      "data-watsonx-data",
      "IBM watsonx.data",
      "data-innovate",
      "LEAD_ATTACH",
      ["data-genai"],
      "Open data lakehouse for AI and analytics.",
      "Lakehouse aberto para IA e analytics.",
    ),
    technology(
      "data-concert",
      "IBM Concert",
      "data-scale",
      "EXPANSION_ATTACH",
      ["data-operationalize"],
      "Operational intelligence and automation.",
      "Inteligência operacional e automação.",
    ),
    technology(
      "data-planning",
      "IBM Planning Analytics",
      "data-scale",
      "EXPANSION_ATTACH",
      ["data-operationalize"],
      "Planning, forecasting, and scenario modeling.",
      "Planejamento, forecasting e modelagem de cenários.",
    ),
  ],
  questions: [],
};
dataAi.questions = [
  question({
    id: "data-governance",
    pillar: dataAi.key,
    journeyIds: ["data-govern"],
    capabilityIds: ["data-governance"],
    title: l("Trusted data foundation", "Fundação de dados confiável"),
    question: l(
      "Are critical data assets cataloged, owned, classified, and governed with measurable quality?",
      "Ativos críticos de dados são catalogados, possuem owner, classificação e governança com qualidade mensurável?",
    ),
    rationale: l(
      "Trusted data is a prerequisite for analytics and responsible AI.",
      "Dados confiáveis são pré-requisito para analytics e IA responsável.",
    ),
    businessImpact: 96,
    keywords: ["catalog", "quality", "owner", "governance"],
    technologyIds: [
      "data-knowledge-catalog",
      "data-governance-product",
      "data-bob",
    ],
  }),
  question({
    id: "data-integration",
    pillar: dataAi.key,
    journeyIds: ["data-integrate"],
    capabilityIds: ["data-integration"],
    title: l("Enterprise data fabric", "Data fabric empresarial"),
    question: l(
      "Can data move reliably across core systems, cloud platforms, APIs, and analytics environments?",
      "Os dados trafegam de forma confiável entre sistemas core, cloud, APIs e ambientes analíticos?",
    ),
    rationale: l(
      "Fragmented integration limits reuse, quality, and time to insight.",
      "Integração fragmentada limita reuso, qualidade e tempo para gerar insights.",
    ),
    businessImpact: 90,
    keywords: ["data integration", "etl", "api", "fabric"],
    technologyIds: ["data-datastage", "data-app-connect", "data-webmethods"],
  }),
  question({
    id: "data-streaming",
    pillar: dataAi.key,
    journeyIds: ["data-stream"],
    capabilityIds: ["data-streaming"],
    title: l("Real-time intelligence", "Inteligência em tempo real"),
    question: l(
      "Is there a business need for real-time events, streaming analytics, or event-driven applications?",
      "Existe necessidade de negócio para eventos em tempo real, streaming analytics ou aplicações orientadas a eventos?",
    ),
    rationale: l(
      "A confirmed real-time use case activates streaming technology fit.",
      "Um caso de uso confirmado em tempo real ativa aderência de tecnologias de streaming.",
    ),
    businessImpact: 86,
    keywords: ["real time", "streaming", "event driven", "kafka"],
    technologyIds: ["data-confluent", "data-kafka"],
    mode: "opportunity-on-yes",
  }),
  question({
    id: "data-genai",
    pillar: dataAi.key,
    journeyIds: ["data-innovate"],
    capabilityIds: ["data-genai"],
    title: l("Generative and agentic AI", "IA generativa e agêntica"),
    question: l(
      "Are generative AI or agentic AI use cases funded, piloted, or prioritized for the next 12 months?",
      "Casos de IA generativa ou agêntica estão financiados, em piloto ou priorizados para os próximos 12 meses?",
    ),
    rationale: l(
      "Active use cases connect the data foundation to an AI opportunity.",
      "Casos ativos conectam a fundação de dados a uma oportunidade de IA.",
    ),
    businessImpact: 94,
    keywords: ["genai", "agentic", "ai", "use case"],
    technologyIds: [
      "data-watsonx-ai",
      "data-watsonx-data",
      "data-governance-product",
    ],
    mode: "opportunity-on-yes",
  }),
  question({
    id: "data-ai-controls",
    pillar: dataAi.key,
    journeyIds: ["data-govern", "data-scale"],
    capabilityIds: ["data-governance", "data-operationalize"],
    title: l("AI operational controls", "Controles operacionais de IA"),
    question: l(
      "Are AI models and agents monitored, governed, and connected to accountable operating processes?",
      "Modelos e agentes de IA são monitorados, governados e conectados a processos operacionais com responsáveis?",
    ),
    rationale: l(
      "Scaling AI requires governance, monitoring, and clear accountability.",
      "Escalar IA exige governança, monitoramento e accountability clara.",
    ),
    businessImpact: 98,
    keywords: ["ai governance", "monitoring", "model", "agent"],
    technologyIds: ["data-governance-product", "data-bob", "data-concert"],
  }),
  question({
    id: "data-planning",
    pillar: dataAi.key,
    journeyIds: ["data-scale"],
    capabilityIds: ["data-operationalize"],
    title: l(
      "Planning and decision intelligence",
      "Planejamento e inteligência de decisão",
    ),
    question: l(
      "Are planning, forecasting, and operational decisions driven by connected and current data?",
      "Planejamento, forecasting e decisões operacionais são orientados por dados conectados e atuais?",
    ),
    rationale: l(
      "Disconnected planning creates slow decisions and low confidence.",
      "Planejamento desconectado cria decisões lentas e baixa confiança.",
    ),
    businessImpact: 82,
    keywords: ["planning", "forecast", "decision", "scenario"],
    technologyIds: ["data-planning", "data-concert"],
  }),
];

const workplace: KyndrylPillar = {
  key: "modern-workplace",
  label: l("Modern Workplace", "Workplace moderno"),
  shortLabel: l("Workplace", "Workplace"),
  description: l(
    "Empower, assist, automate, observe, and optimize employee experience.",
    "Empoderar, assistir, automatizar, observar e otimizar a experiência dos colaboradores.",
  ),
  objective: l(
    "Transform employee experience through AI-powered productivity, intelligent support, workplace automation, and digital experience management.",
    "Transformar a experiência do colaborador com produtividade orientada por IA, suporte inteligente, automação e gestão de experiência digital.",
  ),
  workshop: l(
    "Modern workplace opportunity assessment",
    "Assessment de oportunidades de workplace moderno",
  ),
  outcomes: [
    l("Higher employee productivity", "Maior produtividade dos colaboradores"),
    l(
      "Faster support and ticket deflection",
      "Suporte mais rápido e deflexão de tickets",
    ),
    l(
      "Better digital employee experience",
      "Melhor experiência digital do colaborador",
    ),
    l("Transparent workplace cost", "Custos de workplace transparentes"),
  ],
  journeys: [
    {
      id: "work-empower",
      label: l("Empower", "Empoderar"),
      description: l(
        "Enable the AI workforce.",
        "Habilitar a força de trabalho com IA.",
      ),
    },
    {
      id: "work-assist",
      label: l("Assist", "Assistir"),
      description: l(
        "Deliver AI-powered employee support.",
        "Entregar suporte ao colaborador orientado por IA.",
      ),
    },
    {
      id: "work-automate",
      label: l("Automate", "Automatizar"),
      description: l(
        "Modernize workplace operations.",
        "Modernizar operações de workplace.",
      ),
    },
    {
      id: "work-observe",
      label: l("Observe", "Observar"),
      description: l(
        "Improve employee experience.",
        "Melhorar a experiência do colaborador.",
      ),
    },
    {
      id: "work-optimize",
      label: l("Optimize", "Otimizar"),
      description: l(
        "Drive workplace intelligence.",
        "Gerar inteligência de workplace.",
      ),
    },
  ],
  capabilities: [
    capability(
      "work-ai",
      "AI-enabled workforce",
      "Força de trabalho habilitada por IA",
      "work-empower",
    ),
    capability(
      "work-support",
      "Conversational employee support",
      "Suporte conversacional ao colaborador",
      "work-assist",
    ),
    capability(
      "work-automation",
      "Service desk automation",
      "Automação de service desk",
      "work-automate",
    ),
    capability(
      "work-experience",
      "Digital employee experience",
      "Experiência digital do colaborador",
      "work-observe",
    ),
    capability(
      "work-finops",
      "Workplace financial intelligence",
      "Inteligência financeira de workplace",
      "work-optimize",
    ),
  ],
  technologies: [
    technology(
      "work-assistant",
      "IBM watsonx Assistant",
      "work-assist",
      "LEAD_ATTACH",
      ["work-support"],
      "Conversational AI for employee support.",
      "IA conversacional para suporte ao colaborador.",
    ),
    technology(
      "work-bob",
      "IBM Build Operate Broker (BOB)",
      "work-assist",
      "LEAD_ATTACH",
      ["work-support"],
      "Governed workplace service operations.",
      "Operações governadas de serviços de workplace.",
    ),
    technology(
      "work-concert",
      "IBM Concert",
      "work-automate",
      "OPPORTUNITY_ATTACH",
      ["work-automation"],
      "Operational intelligence and coordinated actions.",
      "Inteligência operacional e ações coordenadas.",
    ),
    technology(
      "work-service-desk",
      "IBM Service Desk Automation",
      "work-automate",
      "OPPORTUNITY_ATTACH",
      ["work-automation"],
      "Automated service workflows and ticket routing.",
      "Workflows de serviço e roteamento de tickets automatizados.",
    ),
    technology(
      "work-instana",
      "IBM Instana Digital Experience",
      "work-observe",
      "OPPORTUNITY_ATTACH",
      ["work-experience"],
      "Real-time employee digital-experience monitoring.",
      "Monitoramento em tempo real da experiência digital.",
    ),
    technology(
      "work-apptio",
      "IBM Apptio",
      "work-optimize",
      "EXPANSION_ATTACH",
      ["work-finops"],
      "Workplace cost transparency and optimization.",
      "Transparência e otimização de custos de workplace.",
    ),
  ],
  questions: [],
};
workplace.questions = [
  question({
    id: "work-ai-adoption",
    pillar: workplace.key,
    journeyIds: ["work-empower"],
    capabilityIds: ["work-ai"],
    title: l("AI workforce adoption", "Adoção de IA no trabalho"),
    question: l(
      "Is employee productivity with copilots or AI assistants a funded or executive priority?",
      "Produtividade dos colaboradores com copilots ou assistentes de IA é uma prioridade financiada ou executiva?",
    ),
    rationale: l(
      "An executive AI-workforce priority creates urgency for adoption, support, and governance.",
      "Uma prioridade executiva de força de trabalho com IA cria urgência para adoção, suporte e governança.",
    ),
    businessImpact: 86,
    keywords: ["copilot", "employee ai", "productivity"],
    technologyIds: ["work-assistant", "work-bob"],
    mode: "opportunity-on-yes",
  }),
  question({
    id: "work-support",
    pillar: workplace.key,
    journeyIds: ["work-assist"],
    capabilityIds: ["work-support"],
    title: l("Employee self-service", "Autosserviço do colaborador"),
    question: l(
      "Can employees resolve common questions and service requests through consistent conversational self-service?",
      "Colaboradores resolvem dúvidas e solicitações comuns por autosserviço conversacional consistente?",
    ),
    rationale: l(
      "Low self-service increases ticket volume and support cost.",
      "Baixo autosserviço aumenta volume de tickets e custo de suporte.",
    ),
    businessImpact: 88,
    keywords: ["self service", "employee support", "assistant"],
    technologyIds: ["work-assistant", "work-bob"],
  }),
  question({
    id: "work-service-desk",
    pillar: workplace.key,
    journeyIds: ["work-automate"],
    capabilityIds: ["work-automation"],
    title: l("Service desk automation", "Automação de service desk"),
    question: l(
      "Are ticket classification, routing, fulfillment, and repetitive workplace workflows automated?",
      "Classificação, roteamento, atendimento de tickets e workflows repetitivos de workplace são automatizados?",
    ),
    rationale: l(
      "Automation improves resolution time and reduces repetitive work.",
      "Automação melhora tempo de resolução e reduz trabalho repetitivo.",
    ),
    businessImpact: 92,
    keywords: ["service desk", "ticket", "workflow", "automation"],
    technologyIds: ["work-service-desk", "work-concert"],
  }),
  question({
    id: "work-experience",
    pillar: workplace.key,
    journeyIds: ["work-observe"],
    capabilityIds: ["work-experience"],
    title: l(
      "Digital employee experience",
      "Experiência digital do colaborador",
    ),
    question: l(
      "Is employee device and application experience monitored in real time with actionable diagnostics?",
      "A experiência do colaborador com dispositivos e aplicações é monitorada em tempo real com diagnósticos acionáveis?",
    ),
    rationale: l(
      "Experience visibility connects technical performance to employee productivity.",
      "Visibilidade de experiência conecta performance técnica à produtividade.",
    ),
    businessImpact: 84,
    keywords: ["digital experience", "device", "application performance"],
    technologyIds: ["work-instana", "work-concert"],
  }),
  question({
    id: "work-outcomes",
    pillar: workplace.key,
    journeyIds: ["work-observe", "work-optimize"],
    capabilityIds: ["work-experience", "work-finops"],
    title: l("Workplace outcomes", "Resultados de workplace"),
    question: l(
      "Are employee experience, ticket reduction, productivity, and cost outcomes measured together?",
      "Experiência do colaborador, redução de tickets, produtividade e custos são medidos em conjunto?",
    ),
    rationale: l(
      "Shared outcomes are required to prove value and prioritize improvements.",
      "Resultados compartilhados são necessários para provar valor e priorizar melhorias.",
    ),
    businessImpact: 78,
    keywords: [
      "employee experience",
      "ticket reduction",
      "productivity",
      "cost",
    ],
    technologyIds: ["work-concert", "work-instana", "work-apptio"],
  }),
  question({
    id: "work-cost",
    pillar: workplace.key,
    journeyIds: ["work-optimize"],
    capabilityIds: ["work-finops"],
    title: l(
      "Workplace cost transparency",
      "Transparência de custos de workplace",
    ),
    question: l(
      "Are software, device, support, and workplace service costs allocated and optimized by business unit?",
      "Custos de software, dispositivos, suporte e serviços de workplace são alocados e otimizados por unidade de negócio?",
    ),
    rationale: l(
      "Cost transparency exposes waste and supports investment decisions.",
      "Transparência de custos expõe desperdícios e sustenta decisões de investimento.",
    ),
    businessImpact: 80,
    keywords: ["workplace cost", "software", "device", "allocation"],
    technologyIds: ["work-apptio", "work-concert"],
  }),
];

const cyber: KyndrylPillar = {
  key: "cyber-security",
  label: l("Zero Trust & Cyber Security", "Zero Trust e cibersegurança"),
  shortLabel: l("Cyber Security", "Cibersegurança"),
  description: l(
    "Identify, protect, detect, respond, and recover across hybrid environments.",
    "Identificar, proteger, detectar, responder e recuperar em ambientes híbridos.",
  ),
  objective: l(
    "Build a Zero Trust architecture that protects identities, data, applications, and infrastructure while strengthening cyber resilience.",
    "Construir uma arquitetura Zero Trust que proteja identidades, dados, aplicações e infraestrutura, fortalecendo a resiliência cibernética.",
  ),
  workshop: l(
    "Zero Trust and cyber resilience assessment",
    "Assessment de Zero Trust e resiliência cibernética",
  ),
  outcomes: [
    l(
      "Stronger identity and data protection",
      "Proteção mais forte de identidades e dados",
    ),
    l(
      "Faster threat detection and response",
      "Detecção e resposta a ameaças mais rápidas",
    ),
    l("Reduced attack surface", "Superfície de ataque reduzida"),
    l("Tested cyber recovery", "Recuperação cibernética testada"),
  ],
  journeys: [
    {
      id: "cyber-identify",
      label: l("Identify", "Identificar"),
      description: l(
        "Establish identity as the perimeter.",
        "Estabelecer identidade como perímetro.",
      ),
    },
    {
      id: "cyber-protect",
      label: l("Protect", "Proteger"),
      description: l("Safeguard sensitive data.", "Proteger dados sensíveis."),
    },
    {
      id: "cyber-detect",
      label: l("Detect", "Detectar"),
      description: l(
        "Gain full threat visibility.",
        "Obter visibilidade completa de ameaças.",
      ),
    },
    {
      id: "cyber-respond",
      label: l("Respond", "Responder"),
      description: l(
        "Modernize security operations.",
        "Modernizar operações de segurança.",
      ),
    },
    {
      id: "cyber-recover",
      label: l("Recover", "Recuperar"),
      description: l(
        "Build cyber resilience.",
        "Construir resiliência cibernética.",
      ),
    },
  ],
  capabilities: [
    capability(
      "cyber-identity",
      "Identity and privileged access",
      "Identidade e acesso privilegiado",
      "cyber-identify",
    ),
    capability(
      "cyber-data",
      "Sensitive data protection",
      "Proteção de dados sensíveis",
      "cyber-protect",
    ),
    capability(
      "cyber-detection",
      "Threat detection and event correlation",
      "Detecção de ameaças e correlação de eventos",
      "cyber-detect",
    ),
    capability(
      "cyber-response",
      "Security operations and response",
      "Operações e resposta de segurança",
      "cyber-respond",
    ),
    capability(
      "cyber-recovery",
      "Cyber recovery and resilience",
      "Recuperação e resiliência cibernética",
      "cyber-recover",
    ),
  ],
  technologies: [
    technology(
      "cyber-verify",
      "IBM Verify",
      "cyber-identify",
      "LEAD_ATTACH",
      ["cyber-identity"],
      "Identity, MFA, and access governance.",
      "Identidade, MFA e governança de acesso.",
    ),
    technology(
      "cyber-vault",
      "HashiCorp Vault",
      "cyber-identify",
      "OPPORTUNITY_ATTACH",
      ["cyber-identity"],
      "Secrets and machine-identity protection.",
      "Proteção de segredos e identidades de máquinas.",
    ),
    technology(
      "cyber-guardium",
      "IBM Guardium",
      "cyber-protect",
      "LEAD_ATTACH",
      ["cyber-data"],
      "Sensitive-data discovery and protection.",
      "Descoberta e proteção de dados sensíveis.",
    ),
    technology(
      "cyber-qradar",
      "IBM QRadar Suite",
      "cyber-detect",
      "LEAD_ATTACH",
      ["cyber-detection"],
      "Threat detection, SIEM, and XDR.",
      "Detecção de ameaças, SIEM e XDR.",
    ),
    technology(
      "cyber-confluent",
      "Confluent Security Event Streaming",
      "cyber-detect",
      "OPPORTUNITY_ATTACH",
      ["cyber-detection"],
      "Real-time security-event streaming.",
      "Streaming de eventos de segurança em tempo real.",
    ),
    technology(
      "cyber-xforce",
      "IBM X-Force",
      "cyber-respond",
      "OPPORTUNITY_ATTACH",
      ["cyber-response"],
      "Threat intelligence and incident response.",
      "Inteligência de ameaças e resposta a incidentes.",
    ),
    technology(
      "cyber-bob",
      "IBM Build Operate Broker (BOB)",
      "cyber-respond",
      "OPPORTUNITY_ATTACH",
      ["cyber-response"],
      "Governed security operating model.",
      "Modelo operacional de segurança governado.",
    ),
    technology(
      "cyber-concert",
      "IBM Concert",
      "cyber-recover",
      "EXPANSION_ATTACH",
      ["cyber-recovery"],
      "Correlated security intelligence and automation.",
      "Inteligência de segurança correlacionada e automação.",
    ),
    technology(
      "cyber-recovery",
      "IBM Cyber Vault",
      "cyber-recover",
      "EXPANSION_ATTACH",
      ["cyber-recovery"],
      "Immutable backup and cyber recovery.",
      "Backup imutável e recuperação cibernética.",
    ),
  ],
  questions: [],
};
cyber.questions = [
  question({
    id: "cyber-identity",
    pillar: cyber.key,
    journeyIds: ["cyber-identify"],
    capabilityIds: ["cyber-identity"],
    title: l("Identity perimeter", "Perímetro de identidade"),
    question: l(
      "Are MFA, privileged access, machine identities, and access lifecycle governed consistently?",
      "MFA, acessos privilegiados, identidades de máquinas e ciclo de vida de acessos são governados de forma consistente?",
    ),
    rationale: l(
      "Identity is the primary control plane in a Zero Trust architecture.",
      "Identidade é o principal plano de controle em uma arquitetura Zero Trust.",
    ),
    businessImpact: 98,
    keywords: ["mfa", "privileged", "identity", "access"],
    technologyIds: ["cyber-verify", "cyber-vault"],
  }),
  question({
    id: "cyber-data",
    pillar: cyber.key,
    journeyIds: ["cyber-protect"],
    capabilityIds: ["cyber-data"],
    title: l("Sensitive data protection", "Proteção de dados sensíveis"),
    question: l(
      "Are sensitive data discovered, classified, monitored, and protected across hybrid environments?",
      "Dados sensíveis são descobertos, classificados, monitorados e protegidos em ambientes híbridos?",
    ),
    rationale: l(
      "Unclassified data creates privacy, compliance, and breach exposure.",
      "Dados sem classificação criam exposição de privacidade, compliance e vazamento.",
    ),
    businessImpact: 100,
    keywords: ["sensitive data", "classification", "privacy", "compliance"],
    technologyIds: ["cyber-guardium"],
  }),
  question({
    id: "cyber-detection",
    pillar: cyber.key,
    journeyIds: ["cyber-detect"],
    capabilityIds: ["cyber-detection"],
    title: l("Threat visibility", "Visibilidade de ameaças"),
    question: l(
      "Are threat signals correlated in real time across cloud, infrastructure, applications, and identities?",
      "Sinais de ameaça são correlacionados em tempo real entre cloud, infraestrutura, aplicações e identidades?",
    ),
    rationale: l(
      "Fragmented detection delays investigation and response.",
      "Detecção fragmentada atrasa investigação e resposta.",
    ),
    businessImpact: 98,
    keywords: ["threat", "siem", "xdr", "event correlation"],
    technologyIds: ["cyber-qradar", "cyber-confluent"],
  }),
  question({
    id: "cyber-response",
    pillar: cyber.key,
    journeyIds: ["cyber-respond"],
    capabilityIds: ["cyber-response"],
    title: l("Incident response", "Resposta a incidentes"),
    question: l(
      "Are security incidents handled through tested playbooks, threat intelligence, clear ownership, and coordinated response?",
      "Incidentes de segurança são tratados por playbooks testados, inteligência de ameaças, ownership claro e resposta coordenada?",
    ),
    rationale: l(
      "Coordinated response reduces containment time and business impact.",
      "Resposta coordenada reduz tempo de contenção e impacto no negócio.",
    ),
    businessImpact: 100,
    keywords: ["incident response", "playbook", "threat intelligence"],
    technologyIds: ["cyber-xforce", "cyber-bob", "cyber-concert"],
  }),
  question({
    id: "cyber-recovery",
    pillar: cyber.key,
    journeyIds: ["cyber-recover"],
    capabilityIds: ["cyber-recovery"],
    title: l("Cyber recovery", "Recuperação cibernética"),
    question: l(
      "Are immutable backups and isolated cyber-recovery environments available for critical workloads?",
      "Backups imutáveis e ambientes isolados de recuperação cibernética estão disponíveis para workloads críticos?",
    ),
    rationale: l(
      "Recovery capability limits the business impact of destructive attacks.",
      "Capacidade de recuperação limita o impacto de ataques destrutivos.",
    ),
    businessImpact: 100,
    keywords: ["immutable backup", "cyber recovery", "critical workload"],
    technologyIds: ["cyber-recovery", "cyber-concert"],
  }),
  question({
    id: "cyber-testing",
    pillar: cyber.key,
    journeyIds: ["cyber-recover"],
    capabilityIds: ["cyber-recovery"],
    title: l("Recovery readiness", "Prontidão de recuperação"),
    question: l(
      "Are cyber-recovery plans tested regularly against defined RTO, RPO, and business-continuity criteria?",
      "Planos de recuperação cibernética são testados regularmente contra critérios de RTO, RPO e continuidade?",
    ),
    rationale: l(
      "An untested recovery plan is still a material resilience gap.",
      "Um plano de recuperação não testado continua sendo uma lacuna material.",
    ),
    businessImpact: 96,
    keywords: ["rto", "rpo", "recovery test", "continuity"],
    technologyIds: ["cyber-recovery", "cyber-concert"],
  }),
];

export const KYNDYRL_PILLARS: KyndrylPillar[] = [
  ibmZ,
  infrastructure,
  applications,
  sap,
  modernOperations,
  dataAi,
  workplace,
  cyber,
];

export const KYNDYRL_QUESTION_CATALOG = KYNDYRL_PILLARS.flatMap(
  (pillar) => pillar.questions,
);

const pillarByKey = new Map(
  KYNDYRL_PILLARS.map((pillar) => [pillar.key, pillar]),
);
const questionById = new Map(
  KYNDYRL_QUESTION_CATALOG.map((item) => [item.id, item]),
);

export function getKyndrylPillar(key: string) {
  return pillarByKey.get(key as KyndrylPillarKey) || null;
}

export function getKyndrylQuestion(id: string) {
  return questionById.get(id) || null;
}

export function getLocalizedKyndrylPillar(key: string, locale: Locale) {
  const pillar = getKyndrylPillar(key);
  if (!pillar) return null;
  return {
    ...pillar,
    label: localized(pillar.label, locale),
    shortLabel: localized(pillar.shortLabel, locale),
    description: localized(pillar.description, locale),
    objective: localized(pillar.objective, locale),
    workshop: localized(pillar.workshop, locale),
    outcomes: pillar.outcomes.map((item) => localized(item, locale)),
    journeys: pillar.journeys.map((journey) => ({
      ...journey,
      label: localized(journey.label, locale),
      description: localized(journey.description, locale),
    })),
    capabilities: pillar.capabilities.map((item) => ({
      ...item,
      label: localized(item.label, locale),
    })),
    technologies: pillar.technologies.map((item) => ({
      ...item,
      description: localized(item.description, locale),
    })),
  };
}

export function normalizeDiscoveryResponse(value: unknown): DiscoveryResponse {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
  if (["YES", "SIM", "Y"].includes(normalized)) return "YES";
  if (["NO", "NAO", "N"].includes(normalized)) return "NO";
  if (
    ["N/A", "NA", "NOT_APPLICABLE", "NOT APPLICABLE", "NAO SE APLICA"].includes(
      normalized,
    )
  )
    return "NOT_APPLICABLE";
  return "DONT_KNOW";
}

export type AssessmentAnswer = {
  questionId: string;
  status: "draft" | "confirmed" | "unknown";
  structured?: Record<string, unknown>;
  answerText?: string;
  confidence?: number;
};

export type AssessmentEvidence = {
  id: string;
  questionId: string;
  question: string;
  response: DiscoveryResponse;
  label: string;
  polarity: EvidencePolarity;
  strength: number;
  technologyFit: number;
  capabilityIds: string[];
  journeyIds: string[];
  technologyIds: string[];
};

export type KyndrylTechnologyScore = {
  id: string;
  name: string;
  pillarKey: KyndrylPillarKey;
  journeyId: string;
  journey: string;
  attach: AttachClassification;
  propensity: number;
  confidence: number;
  action:
    | "RECOMMEND_NOW"
    | "VALIDATE"
    | "WATCHLIST"
    | "LOW_PRIORITY"
    | "DO_NOT_RECOMMEND"
    | "GATE_PENDING"
    | "GATE_FAILED";
  gateStatus: "SATISFIED" | "PENDING" | "FAILED" | "NOT_REQUIRED";
  components: {
    evidenceFit: number;
    capabilityGap: number;
    businessImpact: number;
    journeyFit: number;
    attachPriority: number;
    penalties: number;
  };
  evidence: AssessmentEvidence[];
  capabilities: string[];
  explanation: string;
  nextQuestion: string | null;
};

export type KyndrylAssessment = {
  version: string;
  selectedPillars: KyndrylPillarKey[];
  summary: {
    applicableQuestions: number;
    knownAnswers: number;
    dontKnowAnswers: number;
    notApplicableAnswers: number;
    overallConfidence: number;
  };
  pillars: Array<{
    key: KyndrylPillarKey;
    label: string;
    objective: string;
    workshop: string;
    propensity: number;
    confidence: number;
    maturity: number;
    answered: number;
    total: number;
    leadingTechnology: string | null;
  }>;
  journeys: Array<{
    pillarKey: KyndrylPillarKey;
    id: string;
    label: string;
    score: number;
    priority: number;
  }>;
  capabilities: Array<{
    pillarKey: KyndrylPillarKey;
    id: string;
    label: string;
    journeyId: string;
    maturity: number;
    heatmapStatus: "RED" | "AMBER" | "GREEN";
    evidence: AssessmentEvidence[];
  }>;
  technologies: KyndrylTechnologyScore[];
  evidence: AssessmentEvidence[];
  additionalDiscovery: Array<{
    questionId: string;
    question: string;
    reason: string;
  }>;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const average = (values: number[], fallback = 0) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : fallback;
const attachPriority: Record<AttachClassification, number> = {
  LEAD_ATTACH: 100,
  OPPORTUNITY_ATTACH: 78,
  EXPANSION_ATTACH: 64,
};

function answerResponse(answer: AssessmentAnswer): DiscoveryResponse {
  if (answer.status === "unknown") return "DONT_KNOW";
  return normalizeDiscoveryResponse(answer.structured?.value);
}

function actionFor(
  propensity: number,
  confidence: number,
  gateStatus: KyndrylTechnologyScore["gateStatus"],
): KyndrylTechnologyScore["action"] {
  if (gateStatus === "FAILED") return "GATE_FAILED";
  if (gateStatus === "PENDING") return "GATE_PENDING";
  if (propensity >= 80 && confidence >= 55) return "RECOMMEND_NOW";
  if (propensity >= 65) return "VALIDATE";
  if (propensity >= 45) return "WATCHLIST";
  if (propensity >= 25) return "LOW_PRIORITY";
  return "DO_NOT_RECOMMEND";
}

export function scoreKyndrylAssessment(input: {
  answers: AssessmentAnswer[];
  pillarKeys?: string[];
  locale?: Locale;
}): KyndrylAssessment {
  const locale = input.locale || "en-US";
  const answerMap = new Map(
    input.answers
      .filter((answer) => answer.status !== "draft")
      .map((answer) => [answer.questionId, answer]),
  );
  const inferredPillars = Array.from(
    new Set(
      input.answers
        .map((answer) => getKyndrylQuestion(answer.questionId)?.pillar)
        .filter(Boolean) as KyndrylPillarKey[],
    ),
  );
  const selectedPillars = Array.from(
    new Set(
      (input.pillarKeys?.length ? input.pillarKeys : inferredPillars).filter(
        (key): key is KyndrylPillarKey =>
          KYNDYRL_PILLAR_KEYS.includes(key as KyndrylPillarKey),
      ),
    ),
  );
  const effectivePillars = selectedPillars.length
    ? selectedPillars
    : [KYNDYRL_PILLAR_KEYS[0]];
  const selectedQuestions = effectivePillars.flatMap(
    (key) => getKyndrylPillar(key)?.questions || [],
  );
  const evidence: AssessmentEvidence[] = [];
  let dontKnowAnswers = 0;
  let notApplicableAnswers = 0;
  let knownAnswers = 0;

  for (const item of selectedQuestions) {
    const answer = answerMap.get(item.id);
    if (!answer) continue;
    const response = answerResponse(answer);
    if (response === "DONT_KNOW") {
      dontKnowAnswers += 1;
      continue;
    }
    if (response === "NOT_APPLICABLE") {
      notApplicableAnswers += 1;
      continue;
    }
    knownAnswers += 1;
    const mapping = item.responseMapping[response];
    evidence.push({
      id: mapping.evidenceId,
      questionId: item.id,
      question: localized(item.question, locale),
      response,
      label: localized(mapping.label, locale),
      polarity: mapping.polarity,
      strength: mapping.strength,
      technologyFit: mapping.technologyFit,
      capabilityIds: item.capabilityIds,
      journeyIds: item.journeyIds,
      technologyIds: mapping.technologyIds,
    });
  }

  const applicableQuestions = Math.max(
    0,
    selectedQuestions.length - notApplicableAnswers,
  );
  const overallConfidence = applicableQuestions
    ? clamp((knownAnswers / applicableQuestions) * 100)
    : 0;
  const capabilities = effectivePillars.flatMap((pillarKey) => {
    const pillar = getKyndrylPillar(pillarKey)!;
    return pillar.capabilities.map((item) => {
      const relevant = evidence.filter((ref) =>
        ref.capabilityIds.includes(item.id),
      );
      const positive = relevant
        .filter((ref) => ref.polarity === "POSITIVE")
        .reduce((sum, ref) => sum + ref.strength, 0);
      const gaps = relevant
        .filter((ref) => ref.polarity === "GAP")
        .reduce((sum, ref) => sum + ref.strength, 0);
      const denominator = positive + gaps;
      const maturity = denominator
        ? clamp(50 + ((positive - gaps) / denominator) * 50)
        : 0;
      return {
        pillarKey,
        id: item.id,
        label: localized(item.label, locale),
        journeyId: item.journeyId,
        maturity,
        heatmapStatus:
          maturity >= 70
            ? ("GREEN" as const)
            : maturity >= 40
              ? ("AMBER" as const)
              : ("RED" as const),
        evidence: relevant,
      };
    });
  });
  const journeys = effectivePillars
    .flatMap((pillarKey) => {
      const pillar = getKyndrylPillar(pillarKey)!;
      return pillar.journeys.map((journey) => {
        const relevantEvidence = evidence.filter((ref) =>
          ref.journeyIds.includes(journey.id),
        );
        const relevantCapabilities = capabilities.filter(
          (item) =>
            item.pillarKey === pillarKey && item.journeyId === journey.id,
        );
        const gapSignal = average(
          relevantEvidence.map((ref) =>
            ref.polarity === "GAP"
              ? ref.technologyFit
              : Math.max(12, ref.technologyFit),
          ),
        );
        const capabilityGap = average(
          relevantCapabilities.map((item) => 100 - item.maturity),
        );
        return {
          pillarKey,
          id: journey.id,
          label: localized(journey.label, locale),
          score: clamp(gapSignal * 0.65 + capabilityGap * 0.35),
          priority: 0,
        };
      });
    })
    .sort((a, b) => b.score - a.score)
    .map((item, index) => ({ ...item, priority: index + 1 }));

  const technologies = effectivePillars
    .flatMap((pillarKey) => {
      const pillar = getKyndrylPillar(pillarKey)!;
      return pillar.technologies.map((profile) => {
        const relevantQuestions = pillar.questions.filter(
          (item) =>
            item.responseMapping.YES.technologyIds.includes(profile.id) ||
            item.responseMapping.NO.technologyIds.includes(profile.id),
        );
        const relevantEvidence = evidence.filter((ref) =>
          ref.technologyIds.includes(profile.id),
        );
        const knownRelevant = relevantQuestions.filter((item) => {
          const answer = answerMap.get(item.id);
          if (!answer) return false;
          const response = answerResponse(answer);
          return response === "YES" || response === "NO";
        });
        const excludedRelevant = relevantQuestions.filter((item) => {
          const answer = answerMap.get(item.id);
          return answer && answerResponse(answer) === "NOT_APPLICABLE";
        });
        const confidenceDenominator = Math.max(
          0,
          relevantQuestions.length - excludedRelevant.length,
        );
        const confidence = confidenceDenominator
          ? clamp((knownRelevant.length / confidenceDenominator) * 100)
          : 0;
        let gateStatus: KyndrylTechnologyScore["gateStatus"] = "NOT_REQUIRED";
        if (profile.requiredGate) {
          const gateAnswer = answerMap.get(profile.requiredGate.questionId);
          const response = gateAnswer
            ? answerResponse(gateAnswer)
            : "DONT_KNOW";
          gateStatus =
            response === profile.requiredGate.response
              ? "SATISFIED"
              : response === "DONT_KNOW" || response === "NOT_APPLICABLE"
                ? "PENDING"
                : "FAILED";
        }
        const evidenceFit = average(
          relevantEvidence.map((item) => item.technologyFit),
        );
        const addressedCapabilities = capabilities.filter(
          (item) =>
            item.pillarKey === pillarKey &&
            profile.capabilityIds.includes(item.id),
        );
        const capabilityGap = average(
          addressedCapabilities.map((item) => 100 - item.maturity),
        );
        const businessImpact = average(
          relevantEvidence.map(
            (item) => getKyndrylQuestion(item.questionId)?.businessImpact || 0,
          ),
        );
        const journeyFit =
          journeys.find(
            (item) =>
              item.pillarKey === pillarKey && item.id === profile.journeyId,
          )?.score || 0;
        const penalties = clamp(
          average(
            relevantEvidence
              .filter((item) => item.technologyFit <= 25)
              .map((item) => 25 - item.technologyFit),
          ),
        );
        let propensity = relevantEvidence.length
          ? clamp(
              evidenceFit * 0.45 +
                capabilityGap * 0.25 +
                businessImpact * 0.15 +
                journeyFit * 0.1 +
                attachPriority[profile.attach] * 0.05 -
                penalties,
            )
          : 0;
        if (gateStatus === "FAILED") propensity = 0;
        const action = actionFor(propensity, confidence, gateStatus);
        const capabilityLabels = addressedCapabilities.map(
          (item) => item.label,
        );
        const firstEvidence = [...relevantEvidence].sort(
          (a, b) => b.technologyFit - a.technologyFit,
        )[0];
        const explanation =
          locale === "pt-BR"
            ? firstEvidence
              ? `${profile.name} foi avaliado porque ${firstEvidence.label.toLowerCase()} impacta ${capabilityLabels.join(", ") || "a capacidade relacionada"}.`
              : `${profile.name} aguarda evidências aplicáveis neste pilar.`
            : firstEvidence
              ? `${profile.name} was assessed because ${firstEvidence.label.toLowerCase()} affects ${capabilityLabels.join(", ") || "the related capability"}.`
              : `${profile.name} is waiting for applicable evidence in this pillar.`;
        const nextQuestionItem = relevantQuestions.find((item) => {
          const answer = answerMap.get(item.id);
          return !answer || answerResponse(answer) === "DONT_KNOW";
        });
        return {
          id: profile.id,
          name: profile.name,
          pillarKey,
          journeyId: profile.journeyId,
          journey: pillar.journeys.find((item) => item.id === profile.journeyId)
            ? localized(
                pillar.journeys.find((item) => item.id === profile.journeyId)!
                  .label,
                locale,
              )
            : profile.journeyId,
          attach: profile.attach,
          propensity,
          confidence,
          action,
          gateStatus,
          components: {
            evidenceFit: clamp(evidenceFit),
            capabilityGap: clamp(capabilityGap),
            businessImpact: clamp(businessImpact),
            journeyFit: clamp(journeyFit),
            attachPriority: attachPriority[profile.attach],
            penalties,
          },
          evidence: relevantEvidence,
          capabilities: capabilityLabels,
          explanation,
          nextQuestion: nextQuestionItem
            ? localized(nextQuestionItem.question, locale)
            : null,
        } satisfies KyndrylTechnologyScore;
      });
    })
    .sort(
      (a, b) =>
        b.propensity - a.propensity ||
        b.confidence - a.confidence ||
        a.name.localeCompare(b.name),
    );

  const pillars = effectivePillars.map((key) => {
    const pillar = getKyndrylPillar(key)!;
    const pillarQuestions = pillar.questions;
    const answered = pillarQuestions.filter((item) => {
      const answer = answerMap.get(item.id);
      return answer && answer.status !== "draft";
    }).length;
    const pillarTechnologies = technologies.filter(
      (item) => item.pillarKey === key,
    );
    const pillarCapabilities = capabilities.filter(
      (item) => item.pillarKey === key,
    );
    return {
      key,
      label: localized(pillar.label, locale),
      objective: localized(pillar.objective, locale),
      workshop: localized(pillar.workshop, locale),
      propensity: pillarTechnologies[0]?.propensity || 0,
      confidence: pillarTechnologies[0]?.confidence || overallConfidence,
      maturity: clamp(average(pillarCapabilities.map((item) => item.maturity))),
      answered,
      total: pillarQuestions.length,
      leadingTechnology: pillarTechnologies[0]?.name || null,
    };
  });

  const additionalDiscovery = selectedQuestions
    .filter((item) => {
      const answer = answerMap.get(item.id);
      return !answer || answerResponse(answer) === "DONT_KNOW";
    })
    .sort((a, b) => b.businessImpact - a.businessImpact)
    .slice(0, 5)
    .map((item) => ({
      questionId: item.id,
      question: localized(item.question, locale),
      reason:
        locale === "pt-BR"
          ? "Esta resposta pode alterar uma recomendação de alta prioridade ou sua confiança."
          : "This answer may change a high-priority recommendation or its confidence.",
    }));

  return {
    version: KYNDYRL_DISCOVERY_VERSION,
    selectedPillars: effectivePillars,
    summary: {
      applicableQuestions,
      knownAnswers,
      dontKnowAnswers,
      notApplicableAnswers,
      overallConfidence,
    },
    pillars,
    journeys,
    capabilities,
    technologies,
    evidence,
    additionalDiscovery,
  };
}

export const kyndrylCapabilityCatalog = KYNDYRL_PILLARS.map((pillar) => ({
  name: pillar.label.en,
  short: pillar.shortLabel.en,
  type: "capability" as const,
  keywords: Array.from(
    new Set(pillar.questions.flatMap((item) => item.keywords)),
  ),
  action: `Conduzir ${pillar.workshop.pt.toLowerCase()} e validar as evidências de maior impacto.`,
  actionEn: `Run the ${pillar.workshop.en.toLowerCase()} and validate the highest-impact evidence.`,
}));

export function localizedKyndrylPlaybooks(locale: Locale) {
  return KYNDYRL_PILLARS.map((pillar) => ({
    key: localized(pillar.shortLabel, locale),
    canonicalKey: pillar.shortLabel.en,
    product: pillar.technologies
      .filter((item) => item.attach === "LEAD_ATTACH")
      .slice(0, 3)
      .map((item) => item.name)
      .join(" + "),
    question: localized(pillar.questions[0].question, locale),
    workshop: localized(pillar.workshop, locale),
  }));
}
