export interface BusinessMetricContext {
  type: string;
  value: number;
  currency: string;
  period: string;
  verificationStatus: string;
}

export interface BusinessAnalysisContext {
  businessName: string;
  businessModel: string | null;
  foundedAt: string | null;
  description: string | null;
  metrics: BusinessMetricContext[];
}

/** Raw, unvalidated output from a provider — AIService must validate before persisting. */
export type RawAIOutput = unknown;

export interface AIProvider {
  readonly name: string;
  analyzeBusiness(context: BusinessAnalysisContext): Promise<RawAIOutput>;
}

export const AI_PROVIDER = 'AI_PROVIDER';
