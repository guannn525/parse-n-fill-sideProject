/**
 * Custom Financial Model Types
 *
 * This module exports all types for the Custom Financial Model system:
 * - Source attribution types for audit trails
 * - Calculation result types with formulas
 * - Core model interfaces (userInput, calculations, types)
 */

// Source Attribution
export type {
  SourceType,
  DocumentLocation,
  SourceReference,
  Footnote,
  ValueWithSource,
  NumberWithSource,
  StringWithSource,
} from './source-reference';

// Calculation Results
export type {
  OutputFormat,
  OperandRef,
  CalculationFormula,
  CalculationStep,
  ValidationResult,
  CalculationResult,
  FormulaDefinition,
  CalculationAuditTrail,
} from './calculation-result';

// Custom Model Core
export type {
  // User Input
  LineItemWithSource,
  ValuationInputs,
  PropertyInfo,
  UserInputSection,
  // Calculations
  RevenueCalculations,
  ExpenseCalculations,
  IncomeCalculations,
  ValuationCalculations,
  CalculationsSection,
  // Types
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
} from './custom-model';
