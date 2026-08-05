export type CdiFeatureFlags = {
  capabilityDrivenFlow: boolean;
  adaptiveQuestions: boolean;
  deterministicScoring: boolean;
  technologyProfiles: boolean;
  explainableRecommendations: boolean;
};

const enabled = (value: string | undefined, fallback = true) =>
  value === undefined ? fallback : !["0", "false", "off"].includes(value.toLowerCase());

/**
 * The Kyndryl branch enables the new deterministic flow by default. Every
 * surface can still be disabled independently to compare against the V2 tag.
 */
export function cdiFeatureFlags(env: Record<string, string | undefined> = process.env): CdiFeatureFlags {
  return {
    capabilityDrivenFlow: enabled(env.CDI_CAPABILITY_DRIVEN_FLOW),
    adaptiveQuestions: enabled(env.CDI_ADAPTIVE_QUESTIONS),
    deterministicScoring: enabled(env.CDI_DETERMINISTIC_SCORING),
    technologyProfiles: enabled(env.CDI_TECHNOLOGY_PROFILES),
    explainableRecommendations: enabled(env.CDI_EXPLAINABLE_RECOMMENDATIONS),
  };
}

