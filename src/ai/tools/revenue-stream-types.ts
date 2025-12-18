/**
 * Revenue Stream Zod Schemas
 *
 * Validation schemas for AI extraction of rent roll data into RevenueStream[] format.
 */

import { z } from "zod";

/**
 * Revenue stream category schema
 */
export const revenueStreamCategorySchema = z.enum([
  "Residential",
  "Commercial",
  "Miscellaneous",
]);

/**
 * Revenue row schema for AI output
 */
export const revenueRowSchema = z.object({
  id: z.string().describe("Unique row identifier"),
  unit: z.string().describe("Unit identifier (Apt 1A, Suite 200)"),
  squareFeet: z.number().nullable().describe("Unit square footage"),
  monthlyRate: z.number().nullable().describe("Monthly rent amount if in document"),
  annualIncome: z.number().nullable().describe("Annual income if in document"),
  isVacant: z.boolean().describe("Whether unit is vacant"),
});

/**
 * Revenue stream schema for AI output
 */
export const revenueStreamSchema = z.object({
  id: z.string().describe("Unique stream identifier"),
  name: z.string().describe("Stream name (Office Rents, Parking)"),
  category: revenueStreamCategorySchema.describe(
    "Residential/Commercial/Miscellaneous"
  ),
  order: z.number().describe("Display order (1-based)"),
  rows: z.array(revenueRowSchema).describe("Individual unit/revenue rows"),
});

/**
 * Input schema for extractRevenueStreams tool
 */
export const extractRevenueStreamsInputSchema = z.object({
  rawText: z.string().describe("AI-readable text content from parser"),
  structuredData: z
    .unknown()
    .optional()
    .describe("Optional JSON data (Excel/CSV rows)"),
  fileName: z.string().describe("Original file name for context"),
  documentTypeHint: z
    .enum(["rent_roll", "operating_statement", "unknown"])
    .default("rent_roll")
    .describe("Hint about document type"),
  propertyTypeHint: z
    .enum(["residential", "commercial", "mixed_use", "unknown"])
    .optional()
    .describe("Hint about property type for categorization"),
});

/**
 * Output schema for AI extraction
 */
export const extractRevenueStreamsOutputSchema = z.object({
  revenueStreams: z.array(revenueStreamSchema),
  overallConfidence: z.number().min(0).max(1).describe("Confidence score 0-1"),
  reasoning: z.string().describe("Extraction reasoning for audit trail"),
  warnings: z.array(z.string()).optional().describe("Any warnings or issues"),
});

/**
 * Type inference from Zod schemas
 */
export type RevenueStreamCategory = z.infer<typeof revenueStreamCategorySchema>;
export type RevenueRowInput = z.infer<typeof revenueRowSchema>;
export type RevenueStreamInput = z.infer<typeof revenueStreamSchema>;
export type ExtractRevenueStreamsInput = z.infer<
  typeof extractRevenueStreamsInputSchema
>;
export type ExtractRevenueStreamsOutput = z.infer<
  typeof extractRevenueStreamsOutputSchema
>;
