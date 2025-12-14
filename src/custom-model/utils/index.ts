/**
 * Custom Model Utilities
 *
 * Utility functions for working with Custom Financial Models.
 */

// Source notation parsing
export {
  parseSourceNotation,
  generateSourceNotation,
  extractSourceReferences,
  replaceSourceNotation,
  validateSourceNotation,
  buildReasoningSummary,
  type ParsedSegment,
  type SourceNotationRef,
} from './source-notation';

// Format converters
export {
  toOtherBranchFormat,
  toGroupedRevenueStreams,
  extractCalculationResults,
  toDirectCapitalizationRateModel,
  type OtherBranchRevenueRow,
  type OtherBranchRevenueStream,
  type OtherBranchExpenseRow,
  type OtherBranchValuationData,
  type OtherBranchSubModuleData,
} from './converter';
