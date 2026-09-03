import { z } from 'zod';

const DataSource = z.enum(['VERIFIED_FACT', 'SELLER_PROVIDED', 'AI_INFERENCE', 'UNKNOWN']);

export const BusinessAnalysisResultSchema = z.object({
  summary: z.string().min(1).max(2000),
  strengths: z.array(z.string()).max(10),
  risks: z.array(z.string()).max(10),
  founderDependency: z.object({ assessment: z.string(), source: DataSource }),
  dataCompleteness: z.enum(['SUFFICIENT', 'INSUFFICIENT_DATA']),
  valuation: z
    .object({
      lowEstimate: z.number().nonnegative(),
      highEstimate: z.number().nonnegative(),
      currency: z.string(),
      confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']),
      factors: z.array(z.string()),
    })
    .nullable(),
});

export type BusinessAnalysisResult = z.infer<typeof BusinessAnalysisResultSchema>;
