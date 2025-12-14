/**
 * Zod Validation Schemas for Custom Financial Model
 *
 * These schemas provide runtime validation for the Custom Financial Model system.
 * All external input should be validated through these schemas before processing.
 */

import { z } from 'zod';

// =============================================================================
// SOURCE ATTRIBUTION SCHEMAS
// =============================================================================

export const sourceTypeSchema = z.enum([
  'user_input',
  'parsed_document',
  'calculated',
  'default',
  'assumption',
]);

export const documentLocationSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  page: z.number().int().positive().optional(),
  cellRef: z.string().optional(),
  line: z.number().int().positive().optional(),
  boundingBox: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
  rawText: z.string().optional(),
  section: z.string().optional(),
});

export const sourceReferenceSchema = z.object({
  sourceType: sourceTypeSchema,
  reference: z.object({
    index: z.number().int().nonnegative().optional(),
    key: z.string().optional(),
    id: z.string().optional(),
  }),
  displayPath: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  timestamp: z.string().datetime(),
  documentLocation: documentLocationSchema.optional(),
  parsingSessionId: z.string().optional(),
  userId: z.string().optional(),
});

export const footnoteSchema = z.object({
  id: z.string(),
  symbol: z.string().max(3),
  text: z.string().min(1),
  category: z.enum(['assumption', 'exception', 'clarification', 'warning']),
});

export const valueWithSourceSchema = z.object({
  value: z.union([z.number(), z.string(), z.null()]),
  source: sourceReferenceSchema,
});

export const numberWithSourceSchema = z.object({
  value: z.number().nullable(),
  source: sourceReferenceSchema,
});

// =============================================================================
// CALCULATION SCHEMAS
// =============================================================================

export const outputFormatSchema = z.enum(['currency', 'percentage', 'number', 'ratio']);

export const operandRefSchema = z.object({
  ref: z.string(),
  label: z.string(),
  description: z.string().optional(),
  coefficient: z.number().optional(),
});

export const calculationFormulaSchema = z.object({
  displayFormula: z.string().min(1),
  expression: z.string().min(1),
  operands: z.array(operandRefSchema),
  operator: z.enum(['add', 'subtract', 'multiply', 'divide', 'sum', 'custom']).optional(),
  calculationFn: z.string().optional(),
});

export const calculationStepSchema = z.object({
  description: z.string(),
  expression: z.string(),
  result: z.number().nullable(),
  order: z.number().int().nonnegative().optional(),
});

export const validationResultSchema = z.object({
  isValid: z.boolean(),
  message: z.string().optional(),
  severity: z.enum(['error', 'warning', 'info']),
});

export const calculationResultSchema = z.object({
  value: z.number().nullable(),
  formula: calculationFormulaSchema,
  steps: z.array(calculationStepSchema).optional(),
  isValid: z.boolean(),
  error: z.string().optional(),
  warning: z.string().optional(),
  source: sourceReferenceSchema,
  outputFormat: outputFormatSchema.optional(),
  currency: z.string().optional(),
  precision: z.number().int().nonnegative().optional(),
  footnotes: z.array(footnoteSchema).optional(),
});

// =============================================================================
// USER INPUT SCHEMAS
// =============================================================================

export const lineItemWithSourceSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  amount: z.number(),
  source: sourceReferenceSchema,
  category: z.string().optional(),
  notes: z.string().optional(),
  flaggedForReview: z.boolean().optional(),
});

export const valuationInputsSchema = z
  .object({
    capRate: numberWithSourceSchema.optional(),
    askingPrice: numberWithSourceSchema.optional(),
    vacancyRate: numberWithSourceSchema.optional(),
  })
  .catchall(numberWithSourceSchema.optional());

export const propertyInfoSchema = z
  .object({
    squareFootage: numberWithSourceSchema.optional(),
    units: numberWithSourceSchema.optional(),
    yearBuilt: numberWithSourceSchema.optional(),
    lotSize: numberWithSourceSchema.optional(),
  })
  .catchall(z.union([numberWithSourceSchema, valueWithSourceSchema]).optional());

export const userInputSectionSchema = z.object({
  revenueItems: z.array(lineItemWithSourceSchema),
  expenseItems: z.array(lineItemWithSourceSchema),
  adjustmentItems: z.array(lineItemWithSourceSchema).optional(),
  propertyInfo: propertyInfoSchema.optional(),
  valuationInputs: valuationInputsSchema.optional(),
});

// =============================================================================
// CALCULATIONS SECTION SCHEMAS
// =============================================================================

export const revenueCalculationsSchema = z.object({
  grossPotentialIncome: calculationResultSchema,
  effectiveGrossIncome: calculationResultSchema,
  vacancyLoss: calculationResultSchema.optional(),
});

export const expenseCalculationsSchema = z.object({
  totalOperatingExpenses: calculationResultSchema,
  expenseRatio: calculationResultSchema.optional(),
  expensePerSqFt: calculationResultSchema.optional(),
});

export const incomeCalculationsSchema = z.object({
  netOperatingIncome: calculationResultSchema,
  noiMargin: calculationResultSchema.optional(),
  noiPerSqFt: calculationResultSchema.optional(),
});

export const valuationCalculationsSchema = z.object({
  propertyValue: calculationResultSchema.optional(),
  pricePerSqFt: calculationResultSchema.optional(),
  grossRentMultiplier: calculationResultSchema.optional(),
  capRate: calculationResultSchema.optional(),
});

export const calculationsSectionSchema = z.object({
  revenue: revenueCalculationsSchema,
  expenses: expenseCalculationsSchema,
  income: incomeCalculationsSchema,
  valuation: valuationCalculationsSchema.optional(),
  custom: z.record(z.string(), calculationResultSchema).optional(),
});

// =============================================================================
// TYPES SECTION SCHEMAS
// =============================================================================

export const fieldValueTypeSchema = z.enum([
  'currency',
  'percentage',
  'number',
  'date',
  'text',
  'boolean',
]);

export const typeMetadataSchema = z.object({
  type: fieldValueTypeSchema,
  currency: z.string().optional(),
  dateFormat: z.string().optional(),
  precision: z.number().int().nonnegative().optional(),
  unit: z.string().optional(),
  footnotes: z.array(footnoteSchema).optional(),
  sourceLocation: documentLocationSchema.optional(),
  isOverridden: z.boolean().optional(),
  originalValue: z.union([z.number(), z.string(), z.null()]).optional(),
  displayFormat: z.string().optional(),
  constraints: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      required: z.boolean().optional(),
    })
    .optional(),
});

export const typesSectionSchema = z.record(z.string(), typeMetadataSchema);

// =============================================================================
// BRIEF REASONING SCHEMAS
// =============================================================================

export const reasoningDecisionSchema = z.object({
  decision: z.string().min(1),
  rationale: z.string().min(1),
  affectedFields: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  alternatives: z.array(z.string()).optional(),
});

export const flaggedItemSchema = z.object({
  field: z.string(),
  reason: z.string().min(1),
  severity: z.enum(['info', 'warning', 'error']),
  suggestedAction: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const briefReasoningSchema = z.object({
  summary: z.string().min(1),
  decisions: z.array(reasoningDecisionSchema),
  flaggedItems: z.array(flaggedItemSchema),
  overallConfidence: z.number().min(0).max(1),
});

// =============================================================================
// METADATA SCHEMAS
// =============================================================================

export const modelMetadataSchema = z.object({
  sourceFileName: z.string().optional(),
  sourceFileType: z.string().optional(),
  processingTimeMs: z.number().nonnegative().optional(),
  modelVersion: z.string(),
  agentModel: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  parsingSessionId: z.string().optional(),
});

// =============================================================================
// COMPLETE MODEL SCHEMAS
// =============================================================================

export const financialModelTypeSchema = z.enum([
  'direct_capitalization',
  'discounted_cash_flow',
  'sales_comparison',
  'cost_approach',
  'development_residual',
  'custom',
]);

export const customFinancialModelOutputSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  modelType: financialModelTypeSchema,
  briefReasoning: briefReasoningSchema,
  customModel: z.object({
    userInput: userInputSectionSchema,
    calculations: calculationsSectionSchema,
    types: typesSectionSchema,
  }),
  metadata: modelMetadataSchema,
});

// Direct Capitalization specific schema
export const directCapitalizationModelOutputSchema = customFinancialModelOutputSchema.extend({
  modelType: z.literal('direct_capitalization'),
  customModel: z.object({
    userInput: userInputSectionSchema.extend({
      valuationInputs: valuationInputsSchema.extend({
        capRate: numberWithSourceSchema,
      }),
    }),
    calculations: calculationsSectionSchema.extend({
      valuation: valuationCalculationsSchema.extend({
        propertyValue: calculationResultSchema,
      }),
    }),
    types: typesSectionSchema,
  }),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type SourceType = z.infer<typeof sourceTypeSchema>;
export type DocumentLocation = z.infer<typeof documentLocationSchema>;
export type SourceReference = z.infer<typeof sourceReferenceSchema>;
export type Footnote = z.infer<typeof footnoteSchema>;
export type LineItemWithSource = z.infer<typeof lineItemWithSourceSchema>;
export type CalculationResult = z.infer<typeof calculationResultSchema>;
export type BriefReasoning = z.infer<typeof briefReasoningSchema>;
export type CustomFinancialModelOutput = z.infer<typeof customFinancialModelOutputSchema>;
export type DirectCapitalizationModelOutput = z.infer<typeof directCapitalizationModelOutputSchema>;
