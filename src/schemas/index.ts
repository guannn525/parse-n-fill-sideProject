/**
 * Zod validation schemas for PARSE-N-FILL
 */

export {
  directCapitalizationRateModelSchema,
  directCapCalculationsSchema,
  directCapResultSchema,
  parseRequestSchema,
  exportRequestSchema,
  lineItemsSchema,
} from "./direct-cap-schema";

// Custom Financial Model Schemas
export {
  // Source Attribution
  sourceTypeSchema,
  documentLocationSchema,
  sourceReferenceSchema,
  footnoteSchema,
  valueWithSourceSchema,
  numberWithSourceSchema,
  // Calculations
  outputFormatSchema,
  operandRefSchema,
  calculationFormulaSchema,
  calculationStepSchema,
  validationResultSchema,
  calculationResultSchema,
  // User Input
  lineItemWithSourceSchema,
  valuationInputsSchema,
  propertyInfoSchema,
  userInputSectionSchema,
  // Calculations Section
  revenueCalculationsSchema,
  expenseCalculationsSchema,
  incomeCalculationsSchema,
  valuationCalculationsSchema,
  calculationsSectionSchema,
  // Types Section
  fieldValueTypeSchema,
  typeMetadataSchema,
  typesSectionSchema,
  // Brief Reasoning
  reasoningDecisionSchema,
  flaggedItemSchema,
  briefReasoningSchema,
  // Metadata
  modelMetadataSchema,
  // Complete Models
  financialModelTypeSchema,
  customFinancialModelOutputSchema,
  directCapitalizationModelOutputSchema,
} from "./custom-model-schema";
