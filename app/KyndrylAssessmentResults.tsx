"use client";

import { Button, ProgressBar, Tag } from "@carbon/react";
import { ArrowRight, Information, Renew } from "@carbon/icons-react";
import type {
  KyndrylAssessment,
  KyndrylTechnologyScore,
} from "@/lib/kyndryl-discovery";
import type { Locale } from "@/lib/i18n";
import type { CapabilityDrivenAssessment } from "@/lib/cdi/engine";
import styles from "./KyndrylAssessmentResults.module.css";

type Props = {
  assessment: KyndrylAssessment;
  locale: Locale;
  onContinue?: () => void;
  onChooseNext?: () => void;
};

const copy = {
  "en-US": {
    eyebrow: "Explainable opportunity intelligence",
    title: "Heatmap and IBM recommendations",
    subtitle:
      "Every recommendation is derived from confirmed discovery answers. Propensity and confidence are shown separately.",
    propensity: "Technology propensity",
    confidence: "Evidence confidence",
    answered: "Known answers",
    dontKnow: "Don't know",
    notApplicable: "N/A",
    formula:
      "45% evidence fit + 25% capability gap + 15% business impact + 10% journey fit + 5% attach priority − penalties",
    maturity: "Capability maturity heatmap",
    capability: "Capability",
    journey: "Journey",
    technologies: "IBM technology recommendations",
    why: "Why this recommendation",
    nextQuestion: "Next evidence to validate",
    components: "Score composition",
    evidenceFit: "Evidence fit",
    capabilityGap: "Capability gap",
    businessImpact: "Business impact",
    journeyFit: "Journey fit",
    attachPriority: "Attach priority",
    penalties: "Penalties",
    gate: "Required gate",
    gatePending: "Pending",
    gateFailed: "Not satisfied",
    gateSatisfied: "Satisfied",
    gateNotRequired: "Not required",
    continue: "Continue discovery",
    chooseNext: "Choose next capability",
    noEvidence:
      "Answer the selected capability questions to activate the heatmap and recommendations.",
    additional: "Highest-value questions still open",
    traceability:
      "Question → evidence → capability → journey → technology → Kyndryl practice",
    practices: "Kyndryl practices activated",
    practicesHelp:
      "Service alignment is derived from the same evidence trail and remains subject to human validation.",
  },
  "pt-BR": {
    eyebrow: "Inteligência de oportunidade explicável",
    title: "Heatmap e recomendações IBM",
    subtitle:
      "Toda recomendação é derivada das respostas confirmadas. Propensão e confiança são exibidas separadamente.",
    propensity: "Propensão tecnológica",
    confidence: "Confiança das evidências",
    answered: "Respostas conhecidas",
    dontKnow: "Não sei",
    notApplicable: "Não se aplica",
    formula:
      "45% aderência das evidências + 25% lacuna de capacidade + 15% impacto de negócio + 10% aderência à jornada + 5% prioridade de attach − penalidades",
    maturity: "Heatmap de maturidade das capacidades",
    capability: "Capacidade",
    journey: "Jornada",
    technologies: "Recomendações de tecnologias IBM",
    why: "Por que esta recomendação",
    nextQuestion: "Próxima evidência a validar",
    components: "Composição do score",
    evidenceFit: "Aderência da evidência",
    capabilityGap: "Lacuna de capacidade",
    businessImpact: "Impacto de negócio",
    journeyFit: "Aderência à jornada",
    attachPriority: "Prioridade de attach",
    penalties: "Penalidades",
    gate: "Gate obrigatório",
    gatePending: "Pendente",
    gateFailed: "Não atendido",
    gateSatisfied: "Atendido",
    gateNotRequired: "Não necessário",
    continue: "Continuar descoberta",
    chooseNext: "Escolher próxima capacidade",
    noEvidence:
      "Responda às perguntas da capacidade selecionada para ativar o heatmap e as recomendações.",
    additional: "Perguntas de maior valor ainda abertas",
    traceability:
      "Pergunta → evidência → capacidade → jornada → tecnologia → prática Kyndryl",
    practices: "Práticas Kyndryl ativadas",
    practicesHelp:
      "A aderência de serviços deriva da mesma trilha de evidências e permanece sujeita à validação humana.",
  },
} as const;

const actionLabel = (
  action: KyndrylTechnologyScore["action"],
  locale: Locale,
  propensity = 0,
  confidence = 0,
) => {
  if (action === "VALIDATE" && propensity >= 80 && confidence < 70)
    return locale === "pt-BR"
      ? "Alto potencial · descoberta adicional"
      : "High potential · additional discovery";
  const labels = {
    "en-US": {
      RECOMMEND_NOW: "Recommend now",
      VALIDATE: "Strong candidate · validate",
      WATCHLIST: "Supporting · watchlist",
      LOW_PRIORITY: "Low priority",
      DO_NOT_RECOMMEND: "Do not recommend",
      GATE_PENDING: "Required gate pending",
      GATE_FAILED: "Required gate not satisfied",
    },
    "pt-BR": {
      RECOMMEND_NOW: "Recomendar agora",
      VALIDATE: "Forte candidato · validar",
      WATCHLIST: "Apoio · acompanhar",
      LOW_PRIORITY: "Baixa prioridade",
      DO_NOT_RECOMMEND: "Não recomendar",
      GATE_PENDING: "Gate obrigatório pendente",
      GATE_FAILED: "Gate obrigatório não atendido",
    },
  } as const;
  return labels[locale][action];
};

const toneFor = (value: number) =>
  value >= 70 ? styles.green : value >= 40 ? styles.amber : styles.red;

const actionTone = (action: KyndrylTechnologyScore["action"]) => {
  if (action === "RECOMMEND_NOW") return "green";
  if (action === "VALIDATE") return "cyan";
  if (action === "WATCHLIST") return "warm-gray";
  if (action === "GATE_PENDING") return "purple";
  return "red";
};

export default function KyndrylAssessmentResults({
  assessment,
  locale,
  onContinue,
  onChooseNext,
}: Props) {
  const c = copy[locale];
  const capabilityAssessment = assessment as CapabilityDrivenAssessment;
  const hasKnownEvidence = assessment.summary.knownAnswers > 0;
  const leading = assessment.technologies.slice(0, 8);

  return (
    <section className={styles.results} aria-labelledby="kyndryl-results-title">
      <header className={styles.hero}>
        <div>
          <span>{c.eyebrow}</span>
          <h2 id="kyndryl-results-title">{c.title}</h2>
          <p>{c.subtitle}</p>
        </div>
        <div>
          {onContinue && (
            <Button kind="tertiary" onClick={onContinue}>
              {c.continue}
            </Button>
          )}
          {onChooseNext && (
            <Button renderIcon={ArrowRight} onClick={onChooseNext}>
              {c.chooseNext}
            </Button>
          )}
        </div>
      </header>

      <div className={styles.metrics}>
        <article>
          <span>{c.propensity}</span>
          <strong>{assessment.pillars[0]?.propensity || 0}%</strong>
          <ProgressBar
            label={c.propensity}
            hideLabel
            value={assessment.pillars[0]?.propensity || 0}
          />
        </article>
        <article>
          <span>{c.confidence}</span>
          <strong>{assessment.summary.overallConfidence}%</strong>
          <ProgressBar
            label={c.confidence}
            hideLabel
            value={assessment.summary.overallConfidence}
          />
        </article>
        <article>
          <span>{c.answered}</span>
          <strong>
            {assessment.summary.knownAnswers}/
            {assessment.summary.applicableQuestions}
          </strong>
          <small>
            {assessment.summary.dontKnowAnswers} {c.dontKnow} ·{" "}
            {assessment.summary.notApplicableAnswers} {c.notApplicable}
          </small>
        </article>
      </div>

      <div className={styles.formula}>
        <Information size={18} />
        <span>
          <strong>Technology Fit Score</strong> = {c.formula}
        </span>
      </div>

      {!hasKnownEvidence ? (
        <div className={styles.empty}>
          <Renew size={32} />
          <p>{c.noEvidence}</p>
        </div>
      ) : (
        <>
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div>
                <span>{c.traceability}</span>
                <h3>{c.maturity}</h3>
              </div>
              <div className={styles.legend}>
                <span className={styles.gray}>&lt;55 {c.confidence}</span>
                <span className={styles.red}>0–39</span>
                <span className={styles.amber}>40–69</span>
                <span className={styles.green}>70–100</span>
              </div>
            </div>
            <div
              className={styles.heatmap}
              role="table"
              aria-label={c.maturity}
            >
              <div className={styles.heatmapHeader} role="row">
                <span role="columnheader">{c.capability}</span>
                <span role="columnheader">{c.journey}</span>
                <span role="columnheader">Maturity</span>
              </div>
              {assessment.capabilities.map((capability) => (
                <div
                  className={styles.heatmapRow}
                  role="row"
                  key={capability.id}
                >
                  <strong role="cell">{capability.label}</strong>
                  <span role="cell">
                    {assessment.journeys.find(
                      (journey) => journey.id === capability.journeyId,
                    )?.label || capability.journeyId}
                  </span>
                  <span
                    role="cell"
                    className={`${styles.heatCell} ${assessment.pillars.find((item) => String(item.key) === String(capability.pillarKey))?.confidence < 55 ? styles.gray : toneFor(capability.maturity)}`}
                    aria-label={`${capability.label}: ${capability.maturity}%`}
                  >
                    {capability.maturity}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div>
                <span>IBM portfolio fit</span>
                <h3>{c.technologies}</h3>
              </div>
            </div>
            <div className={styles.technologyList}>
              {leading.map((technology, index) => (
                <article className={styles.technology} key={technology.id}>
                  <div className={styles.technologyHead}>
                    <span className={styles.rank}>{index + 1}</span>
                    <div>
                      <h4>{technology.name}</h4>
                      <small>
                        {technology.journey} ·{" "}
                        {technology.attach.replaceAll("_", " ")}
                      </small>
                    </div>
                    <Tag type={actionTone(technology.action)}>
                      {actionLabel(
                        technology.action,
                        locale,
                        technology.propensity,
                        technology.confidence,
                      )}
                    </Tag>
                  </div>
                  <div className={styles.propensity}>
                    <span>
                      {c.propensity} <strong>{technology.propensity}%</strong>
                    </span>
                    <div>
                      <i style={{ width: `${technology.propensity}%` }} />
                    </div>
                    <small>
                      {c.confidence}: {technology.confidence}%
                    </small>
                  </div>
                  <details>
                    <summary>{c.why}</summary>
                    <p>{technology.explanation}</p>
                    <div className={styles.componentGrid}>
                      {(
                        [
                          ["evidenceFit", c.evidenceFit],
                          ["capabilityGap", c.capabilityGap],
                          ["businessImpact", c.businessImpact],
                          ["journeyFit", c.journeyFit],
                          ["attachPriority", c.attachPriority],
                          ["penalties", c.penalties],
                        ] as const
                      ).map(([key, label]) => (
                        <span key={key}>
                          <small>{label}</small>
                          <strong>{technology.components[key]}</strong>
                        </span>
                      ))}
                    </div>
                    {technology.nextQuestion && (
                      <div className={styles.nextEvidence}>
                        <strong>{c.nextQuestion}</strong>
                        <p>{technology.nextQuestion}</p>
                      </div>
                    )}
                  </details>
                </article>
              ))}
            </div>
          </section>

          {capabilityAssessment.practices?.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <div>
                  <span>{c.traceability}</span>
                  <h3>{c.practices}</h3>
                  <p>{c.practicesHelp}</p>
                </div>
              </div>
              <div className={styles.practiceList}>
                {capabilityAssessment.practices.map((practice) => (
                  <article key={practice.id}>
                    <div>
                      <strong>{practice.name}</strong>
                      <small>
                        {practice.capabilityKeys.length} capabilities · {practice.evidenceCount} evidence items
                      </small>
                    </div>
                    <span>{practice.score}</span>
                  </article>
                ))}
              </div>
            </section>
          )}

          {assessment.additionalDiscovery.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <div>
                  <span>Next best discovery</span>
                  <h3>{c.additional}</h3>
                </div>
              </div>
              <ol className={styles.openQuestions}>
                {assessment.additionalDiscovery.map((item) => (
                  <li key={item.questionId}>
                    <strong>{item.question}</strong>
                    <span>{item.reason}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </section>
  );
}
