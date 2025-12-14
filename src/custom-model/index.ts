/**
 * Custom Financial Model System
 *
 * A templating architecture for creating, validating, and executing financial models.
 * Separates user inputs, calculations, and type metadata while maintaining full
 * auditability and source traceability.
 *
 * ## Architecture Overview
 *
 * Each Custom Financial Model contains three sections:
 *
 * - **userInput**: Values from user entry or document parsing with source tracking
 * - **calculations**: Auditable formulas with human-readable + machine-executable representations
 * - **types**: Metadata for formatting, validation, and source attribution
 *
 * ## Usage Example
 *
 * ```typescript
 * import {
 *   CustomFinancialModelOutput,
 *   directCapFormulas,
 *   toOtherBranchFormat,
 *   parseSourceNotation
 * } from './custom-model';
 *
 * // Parse a document and generate model output
 * const output: CustomFinancialModelOutput = await extractFinancialModel(document);
 *
 * // Parse reasoning summary for UI tooltips
 * const segments = parseSourceNotation(output.briefReasoning.summary);
 *
 * // Convert to other_branch format for integration
 * const subModuleData = toOtherBranchFormat(output);
 * ```
 *
 * ## Key Features
 *
 * 1. **Source Attribution**: Every value tracks its origin for audit trail
 * 2. **Human + Machine Readable**: Formulas have display strings AND executable functions
 * 3. **Confidence Scoring**: AI-extracted values include confidence scores
 * 4. **Selective Escalation**: Low-confidence items flagged for human review
 * 5. **Extensible Templates**: Direct Cap is one template; more can be added
 *
 * @module custom-model
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  // Source Attribution
  SourceType,
  DocumentLocation,
  SourceReference,
  Footnote,
  ValueWithSource,
  NumberWithSource,
  StringWithSource,
  // Calculation Results
  OutputFormat,
  OperandRef,
  CalculationFormula,
  CalculationStep,
  ValidationResult,
  CalculationResult,
  FormulaDefinition,
  CalculationAuditTrail,
  // User Input
  LineItemWithSource,
  ValuationInputs,
  PropertyInfo,
  UserInputSection,
  // Calculations Section
  RevenueCalculations,
  ExpenseCalculations,
  IncomeCalculations,
  ValuationCalculations,
  CalculationsSection,
  // Types Section
  FieldValueType,
  TypeMetadata,
  TypesSection,
  // Reasoning
  ReasoningDecision,
  FlaggedItem,
  BriefReasoning,
  // Metadata
  ModelMetadata,
  // Output
  FinancialModelType,
  CustomFinancialModelOutput,
  // Direct Cap Specific
  DirectCapUserInput,
  DirectCapCalculations,
  DirectCapitalizationModelOutput,
} from './types';

// =============================================================================
// SCHEMA EXPORTS
// =============================================================================

export {
  // Schemas for validation
  sourceReferenceSchema,
  calculationResultSchema,
  briefReasoningSchema,
  customFinancialModelOutputSchema,
  directCapitalizationModelOutputSchema,
  // Individual schemas
  documentLocationSchema,
  footnoteSchema,
  lineItemWithSourceSchema,
  typeMetadataSchema,
} from './schemas';

// =============================================================================
// FORMULA EXPORTS
// =============================================================================

export {
  directCapFormulas,
  getDirectCapFormulas,
  getFormulaById,
  getFormulasByCategory,
} from './formulas';

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export {
  // Source notation
  parseSourceNotation,
  generateSourceNotation,
  extractSourceReferences,
  replaceSourceNotation,
  validateSourceNotation,
  buildReasoningSummary,
  type ParsedSegment,
  type SourceNotationRef,
  // Converters
  toOtherBranchFormat,
  toGroupedRevenueStreams,
  extractCalculationResults,
  toDirectCapitalizationRateModel,
  type OtherBranchRevenueRow,
  type OtherBranchRevenueStream,
  type OtherBranchExpenseRow,
  type OtherBranchValuationData,
  type OtherBranchSubModuleData,
} from './utils';
