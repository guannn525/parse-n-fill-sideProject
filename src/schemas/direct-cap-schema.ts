/**
 * Zod schemas for Direct Capitalization Rate Model validation
 */

import { z } from "zod";

/**
 * Schema for line items (Record<string, number>)
 */
export const lineItemsSchema = z.record(z.string(), z.number());

/**
 * Schema for DirectCapitalizationRateModel
 */
export const directCapitalizationRateModelSchema = z.object({
  timeStamp: z.string().datetime({ message: "Invalid ISO 8601 timestamp" }),
  agentReasoning: z.string().min(1, "Agent reasoning is required"),
  annualOperatingRevenue: lineItemsSchema,
  annualOperatingExpenses: lineItemsSchema,
  oneTimeAdjustment: lineItemsSchema,
});

/**
 * Schema for DirectCapCalculations
 */
export const directCapCalculationsSchema = z.object({
  grossPotentialIncome: z.number(),
  effectiveGrossIncome: z.number(),
  totalOperatingExpenses: z.number(),
  netOperatingIncome: z.number(),
  totalAdjustments: z.number(),
  adjustedValue: z.number().nullable(),
});

/**
 * Schema for processing metadata
 */
export const metadataSchema = z.object({
  sourceFileName: z.string(),
  sourceFileType: z.string(),
  processingTimeMs: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
});

/**
 * Schema for DirectCapResult
 */
export const directCapResultSchema = z.object({
  model: directCapitalizationRateModelSchema,
  calculations: directCapCalculationsSchema,
  metadata: metadataSchema,
});

/**
 * Schema for parse document request
 */
export const parseRequestSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileType: z.string().min(1, "File type is required"),
  fileData: z.string().min(1, "File data is required"), // base64
  options: z
    .object({
      includeRawText: z.boolean().default(false),
    })
    .optional(),
});

/**
 * Schema for export request
 */
export const exportRequestSchema = z.object({
  model: directCapitalizationRateModelSchema,
  options: z
    .object({
      templateName: z.enum(["standard", "detailed"]).default("standard"),
      includeCharts: z.boolean().default(true),
    })
    .optional(),
});

// Type exports inferred from schemas
export type DirectCapitalizationRateModelInput = z.input<
  typeof directCapitalizationRateModelSchema
>;
export type DirectCapitalizationRateModelOutput = z.output<
  typeof directCapitalizationRateModelSchema
>;
export type ParseRequest = z.infer<typeof parseRequestSchema>;
export type ExportRequest = z.infer<typeof exportRequestSchema>;
