/**
 * Test script to verify custom-model implementation
 * Tests actual runtime behavior with sample data
 */

import {
  type CustomFinancialModelOutput,
  customFinancialModelOutputSchema,
  directCapFormulas,
  parseSourceNotation,
  toOtherBranchFormat,
  extractCalculationResults,
} from './src/custom-model';

// Test 1: Schema validation with sample data
console.log('Test 1: Schema Validation');
const sampleModel: CustomFinancialModelOutput = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Test Property',
  modelType: 'direct_capitalization',
  briefReasoning: {
    summary: 'Extracted 2 revenue items totaling ${totalRevenue, tooltip:calculated-key:grossPotentialIncome}',
    decisions: [],
    flaggedItems: [],
    overallConfidence: 0.95,
  },
  customModel: {
    userInput: {
      revenueItems: [
        {
          id: 'rev-1',
          label: 'Rental Income',
          amount: 100000,
          source: {
            sourceType: 'user_input',
            reference: { index: 0 },
            displayPath: 'userInput.revenueItems[0]',
            timestamp: new Date().toISOString(),
          },
        },
      ],
      expenseItems: [
        {
          id: 'exp-1',
          label: 'Property Tax',
          amount: 15000,
          source: {
            sourceType: 'user_input',
            reference: { index: 0 },
            displayPath: 'userInput.expenseItems[0]',
            timestamp: new Date().toISOString(),
          },
        },
      ],
      valuationInputs: {
        capRate: {
          value: 0.065,
          source: {
            sourceType: 'user_input',
            reference: { key: 'capRate' },
            displayPath: 'userInput.valuationInputs.capRate',
            timestamp: new Date().toISOString(),
          },
        },
      },
    },
    calculations: {
      revenue: {
        grossPotentialIncome: {
          value: 100000,
          formula: {
            displayFormula: 'Sum of all Revenue Items',
            expression: 'SUM(userInput.revenueItems.amount)',
            operands: [{ ref: 'userInput.revenueItems', label: 'Revenue Items' }],
          },
          isValid: true,
          source: {
            sourceType: 'calculated',
            reference: { key: 'grossPotentialIncome' },
            displayPath: 'calculations.revenue.grossPotentialIncome',
            timestamp: new Date().toISOString(),
          },
        },
        effectiveGrossIncome: {
          value: 95000,
          formula: {
            displayFormula: 'Gross Potential Income - Vacancy Allowance',
            expression: 'grossPotentialIncome - vacancyAllowance',
            operands: [],
          },
          isValid: true,
          source: {
            sourceType: 'calculated',
            reference: { key: 'effectiveGrossIncome' },
            displayPath: 'calculations.revenue.effectiveGrossIncome',
            timestamp: new Date().toISOString(),
          },
        },
      },
      expenses: {
        totalOperatingExpenses: {
          value: 15000,
          formula: {
            displayFormula: 'Sum of all Expense Items',
            expression: 'SUM(userInput.expenseItems.amount)',
            operands: [],
          },
          isValid: true,
          source: {
            sourceType: 'calculated',
            reference: { key: 'totalOperatingExpenses' },
            displayPath: 'calculations.expenses.totalOperatingExpenses',
            timestamp: new Date().toISOString(),
          },
        },
      },
      income: {
        netOperatingIncome: {
          value: 80000,
          formula: {
            displayFormula: 'Effective Gross Income - Total Operating Expenses',
            expression: 'effectiveGrossIncome - totalOperatingExpenses',
            operands: [],
          },
          isValid: true,
          source: {
            sourceType: 'calculated',
            reference: { key: 'netOperatingIncome' },
            displayPath: 'calculations.income.netOperatingIncome',
            timestamp: new Date().toISOString(),
          },
        },
      },
      valuation: {
        propertyValue: {
          value: 1230769,
          formula: {
            displayFormula: 'Net Operating Income / Cap Rate',
            expression: 'netOperatingIncome / capRate',
            operands: [],
          },
          isValid: true,
          source: {
            sourceType: 'calculated',
            reference: { key: 'propertyValue' },
            displayPath: 'calculations.valuation.propertyValue',
            timestamp: new Date().toISOString(),
          },
        },
      },
    },
    types: {},
  },
  metadata: {
    modelVersion: '1.0.0',
    createdAt: new Date().toISOString(),
  },
};

try {
  const validated = customFinancialModelOutputSchema.parse(sampleModel);
  console.log('✓ Schema validation passed');
} catch (error) {
  console.error('✗ Schema validation failed:', error);
  process.exit(1);
}

// Test 2: Source notation parsing
console.log('\nTest 2: Source Notation Parsing');
const segments = parseSourceNotation(sampleModel.briefReasoning.summary);
console.log('✓ Parsed segments:', segments.length);
console.log('  Reference found:', segments.find(s => s.type === 'reference')?.reference);

// Test 3: Converter to other_branch format
console.log('\nTest 3: Converter to other_branch format');
try {
  const otherBranchData = toOtherBranchFormat(sampleModel);
  console.log('✓ Conversion successful');
  console.log('  Revenue streams:', otherBranchData.revenueStreams.length);
  console.log('  Expense rows:', otherBranchData.expenseRows.length);
  console.log('  Has valuation data:', !!otherBranchData.valuationData);
} catch (error) {
  console.error('✗ Conversion failed:', error);
  process.exit(1);
}

// Test 4: Extract calculation results
console.log('\nTest 4: Extract Calculation Results');
try {
  const results = extractCalculationResults(sampleModel);
  console.log('✓ Extraction successful');
  console.log('  Extracted values:', Object.keys(results).length);
  console.log('  NOI:', results.netOperatingIncome);
  console.log('  Property Value:', results.propertyValue);
} catch (error) {
  console.error('✗ Extraction failed:', error);
  process.exit(1);
}

// Test 5: Formula definitions
console.log('\nTest 5: Formula Definitions');
console.log('✓ Total formulas:', directCapFormulas.length);
console.log('  Formula IDs:', directCapFormulas.map(f => f.id).join(', '));

// Test 6: Formula execution
console.log('\nTest 6: Formula Execution');
const noiFormula = directCapFormulas.find(f => f.id === 'netOperatingIncome');
if (noiFormula) {
  const result = noiFormula.compute({
    effectiveGrossIncome: 95000,
    totalOperatingExpenses: 15000,
  });
  if (result === 80000) {
    console.log('✓ NOI formula computed correctly:', result);
  } else {
    console.error('✗ NOI formula computed incorrectly. Expected 80000, got:', result);
    process.exit(1);
  }
}

console.log('\n✅ All tests passed!');
