/**
 * PARSE-N-FILL
 * Modular financial document parsing API powered by Claude AI
 *
 * @packageDocumentation
 */

// Types
export type {
  DirectCapitalizationRateModel,
  DirectCapCalculations,
  DirectCapResult,
  RevenueStreamCategory,
  RevenueRow,
  RevenueStream,
  RevenueStreamExtractionResult,
} from "./types";

// Custom Financial Model Types
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
  // Direct Cap Specific (from custom-model)
  DirectCapUserInput,
} from "./types/custom-model";

// Schemas
export {
  directCapitalizationRateModelSchema,
  parseRequestSchema,
  exportRequestSchema,
} from "./schemas";

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
} from "./schemas/custom-model-schema";

// API Handlers
export { parseDocument, type ParseDocumentRequest, type ParseDocumentResponse } from "./api";
export { exportToExcel, type ExportExcelRequest } from "./api";

// Parser Layer
export { parseFile, getParser, canParse } from "./parsers";
export type {
  ParsedContent,
  ParsedContentMetadata,
  ParserInput,
  FileParser,
  ExcelSheetData,
} from "./parsers";

// Agent Layer
export { extractRevenueFromDocument } from "./agent";
export type { ExtractionResult, PropertyTypeHint } from "./agent";

// Utilities
export {
  // Error classes
  ParseError,
  ValidationError,
  AIError,
  ExtractionError,
  ExportError,
  // Constants
  SUPPORTED_FILE_TYPES,
  FILE_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  isSupportedFileType,
  getMimeTypeFromExtension,
  // Utility functions
  formatCurrency,
  parseNumericValue,
  sumRecord,
  getCurrentTimestamp,
  truncateText,
  getContextAround,
} from "./lib";

// Custom Financial Model Formulas
export {
  directCapFormulas,
  getDirectCapFormulas,
  getFormulaById,
  getFormulasByCategory,
} from "./lib/direct-cap-formulas";

// Custom Financial Model Utilities
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
} from "./lib/source-notation";

export {
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
} from "./lib/custom-model-converter";

// Version
export const VERSION = "0.1.0";
