/**
 * Custom Financial Model Schemas
 *
 * Zod validation schemas for runtime validation of Custom Financial Model data.
 */

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
} from './custom-model-schema';

// Type exports
export type {
  SourceType,
  DocumentLocation,
  SourceReference,
  Footnote,
  LineItemWithSource,
  CalculationResult,
  BriefReasoning,
  CustomFinancialModelOutput,
  DirectCapitalizationModelOutput,
} from './custom-model-schema';
