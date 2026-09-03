import { Injectable } from '@nestjs/common';
import { AIProvider, BusinessAnalysisContext, RawAIOutput } from './ai-provider.interface';

/**
 * Deterministic offline provider used when AI_PROVIDER=mock (the default).
 * It never invents financial figures — anything not present in `metrics`
 * comes back tagged UNKNOWN / INSUFFICIENT_DATA rather than guessed.
 */
@Injectable()
export class MockAIProvider implements AIProvider {
  readonly name = 'mock';

  async analyzeBusiness(context: BusinessAnalysisContext): Promise<RawAIOutput> {
    const mrr = context.metrics.find((m) => m.type === 'MRR');
    const profit = context.metrics.find((m) => m.type === 'PROFIT');
    const growth = context.metrics.find((m) => m.type === 'GROWTH');

    const hasFinancials = Boolean(mrr || profit);

    const valuation = mrr
      ? {
          lowEstimate: Math.round(mrr.value * 12 * 2),
          highEstimate: Math.round(mrr.value * 12 * 4),
          currency: mrr.currency,
          confidence: mrr.verificationStatus === 'VERIFIED' ? 'MEDIUM' : 'LOW',
          factors: [
            'MRR x 24-48 months (SaaS multiple heuristic)',
            `Source: ${mrr.verificationStatus}`,
          ],
        }
      : null;

    return {
      summary: hasFinancials
        ? `${context.businessName} shows ${mrr ? `MRR of ${mrr.value} ${mrr.currency}` : 'reported profit'}${growth ? ` with ${growth.value}% growth` : ''}.`
        : `Insufficient financial data has been provided for ${context.businessName} to generate a meaningful summary.`,
      strengths: hasFinancials ? ['Revenue data available for analysis'] : [],
      risks: hasFinancials ? [] : ['No verifiable revenue or profit metrics submitted'],
      founderDependency: {
        assessment: 'Insufficient data to assess founder dependency',
        source: 'UNKNOWN',
      },
      dataCompleteness: hasFinancials ? 'SUFFICIENT' : 'INSUFFICIENT_DATA',
      valuation,
    };
  }
}
