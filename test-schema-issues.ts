/**
 * Test for potential type/schema mismatches
 */

import {
  type CustomFinancialModelOutput,
  type PropertyInfo,
  type ValuationInputs,
  customFinancialModelOutputSchema,
  propertyInfoSchema,
  valuationInputsSchema,
} from './src/custom-model';

let errorCount = 0;

function testCase(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}:`, error instanceof Error ? error.message : error);
    errorCount++;
  }
}

console.log('Testing Type/Schema Consistency\n');

const timestamp = new Date().toISOString();

// Test 1: PropertyInfo with dynamic fields
console.log('=== Test 1: PropertyInfo Dynamic Fields ===');

testCase('Accept standard propertyInfo fields', () => {
  const propertyInfo: PropertyInfo = {
    squareFootage: {
      value: 5000,
      source: {
        sourceType: 'user_input',
        reference: { key: 'squareFootage' },
        displayPath: 'userInput.propertyInfo.squareFootage',
        timestamp,
      },
    },
    units: {
      value: 10,
      source: {
        sourceType: 'user_input',
        reference: { key: 'units' },
        displayPath: 'userInput.propertyInfo.units',
        timestamp,
      },
    },
  };

  const result = propertyInfoSchema.safeParse(propertyInfo);
  if (!result.success) {
    throw new Error(`Validation failed: ${JSON.stringify(result.error.errors)}`);
  }
});

testCase('Accept custom propertyInfo fields (number)', () => {
  const propertyInfo: PropertyInfo = {
    customMetric: {
      value: 123.45,
      source: {
        sourceType: 'user_input',
        reference: { key: 'customMetric' },
        displayPath: 'userInput.propertyInfo.customMetric',
        timestamp,
      },
    },
  };

  const result = propertyInfoSchema.safeParse(propertyInfo);
  if (!result.success) {
    throw new Error(`Validation failed: ${JSON.stringify(result.error.errors)}`);
  }
});

testCase('Accept custom propertyInfo fields (string)', () => {
  const propertyInfo = {
    zoning: {
      value: 'Commercial',
      source: {
        sourceType: 'user_input',
        reference: { key: 'zoning' },
        displayPath: 'userInput.propertyInfo.zoning',
        timestamp,
      },
    },
  };

  const result = propertyInfoSchema.safeParse(propertyInfo);
  if (!result.success) {
    throw new Error(`Validation failed: ${JSON.stringify(result.error.errors)}`);
  }
});

// Test 2: ValuationInputs with dynamic fields
console.log('\n=== Test 2: ValuationInputs Dynamic Fields ===');

testCase('Accept standard valuationInputs fields', () => {
  const valuationInputs: ValuationInputs = {
    capRate: {
      value: 0.065,
      source: {
        sourceType: 'user_input',
        reference: { key: 'capRate' },
        displayPath: 'userInput.valuationInputs.capRate',
        timestamp,
      },
    },
    askingPrice: {
      value: 1500000,
      source: {
        sourceType: 'user_input',
        reference: { key: 'askingPrice' },
        displayPath: 'userInput.valuationInputs.askingPrice',
        timestamp,
      },
    },
  };

  const result = valuationInputsSchema.safeParse(valuationInputs);
  if (!result.success) {
    throw new Error(`Validation failed: ${JSON.stringify(result.error.errors)}`);
  }
});

testCase('Accept custom valuationInputs fields', () => {
  const valuationInputs: ValuationInputs = {
    discountRate: {
      value: 0.08,
      source: {
        sourceType: 'user_input',
        reference: { key: 'discountRate' },
        displayPath: 'userInput.valuationInputs.discountRate',
        timestamp,
      },
    },
  };

  const result = valuationInputsSchema.safeParse(valuationInputs);
  if (!result.success) {
    throw new Error(`Validation failed: ${JSON.stringify(result.error.errors)}`);
  }
});

// Test 3: DirectCap specific requirements
console.log('\n=== Test 3: DirectCapitalizationModelOutput ===');

testCase('DirectCap requires capRate in valuationInputs', () => {
  // Import schema separately to test
  const { directCapitalizationModelOutputSchema } = require('./src/custom-model');

  const model = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Test',
    modelType: 'direct_capitalization',
    briefReasoning: {
      summary: 'test',
      decisions: [],
      flaggedItems: [],
      overallConfidence: 1,
    },
    customModel: {
      userInput: {
        revenueItems: [],
        expenseItems: [],
        valuationInputs: {
          capRate: {
            value: 0.065,
            source: {
              sourceType: 'user_input',
              reference: { key: 'capRate' },
              displayPath: '',
              timestamp,
            },
          },
        },
      },
      calculations: {
        revenue: {
          grossPotentialIncome: {
            value: 0,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: { sourceType: 'calculated', reference: {}, displayPath: '', timestamp },
          },
          effectiveGrossIncome: {
            value: 0,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: { sourceType: 'calculated', reference: {}, displayPath: '', timestamp },
          },
        },
        expenses: {
          totalOperatingExpenses: {
            value: 0,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: { sourceType: 'calculated', reference: {}, displayPath: '', timestamp },
          },
        },
        income: {
          netOperatingIncome: {
            value: 0,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: { sourceType: 'calculated', reference: {}, displayPath: '', timestamp },
          },
        },
        valuation: {
          propertyValue: {
            value: 0,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: { sourceType: 'calculated', reference: {}, displayPath: '', timestamp },
          },
        },
      },
      types: {},
    },
    metadata: { modelVersion: '1.0', createdAt: timestamp },
  };

  const result = directCapitalizationModelOutputSchema.safeParse(model);
  if (!result.success) {
    throw new Error(`Validation failed: ${JSON.stringify(result.error.errors)}`);
  }
});

testCase('DirectCap rejects missing capRate', () => {
  const { directCapitalizationModelOutputSchema } = require('./src/custom-model');

  const model = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Test',
    modelType: 'direct_capitalization',
    briefReasoning: {
      summary: 'test',
      decisions: [],
      flaggedItems: [],
      overallConfidence: 1,
    },
    customModel: {
      userInput: {
        revenueItems: [],
        expenseItems: [],
        valuationInputs: {
          askingPrice: {
            value: 1000000,
            source: {
              sourceType: 'user_input',
              reference: { key: 'askingPrice' },
              displayPath: '',
              timestamp,
            },
          },
        },
      },
      calculations: {
        revenue: {
          grossPotentialIncome: {
            value: 0,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: { sourceType: 'calculated', reference: {}, displayPath: '', timestamp },
          },
          effectiveGrossIncome: {
            value: 0,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: { sourceType: 'calculated', reference: {}, displayPath: '', timestamp },
          },
        },
        expenses: {
          totalOperatingExpenses: {
            value: 0,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: { sourceType: 'calculated', reference: {}, displayPath: '', timestamp },
          },
        },
        income: {
          netOperatingIncome: {
            value: 0,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: { sourceType: 'calculated', reference: {}, displayPath: '', timestamp },
          },
        },
        valuation: {
          propertyValue: {
            value: 0,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: { sourceType: 'calculated', reference: {}, displayPath: '', timestamp },
          },
        },
      },
      types: {},
    },
    metadata: { modelVersion: '1.0', createdAt: timestamp },
  };

  const result = directCapitalizationModelOutputSchema.safeParse(model);
  if (result.success) {
    throw new Error('Should reject DirectCap model without capRate');
  }
});

testCase('DirectCap rejects missing propertyValue', () => {
  const { directCapitalizationModelOutputSchema } = require('./src/custom-model');

  const model = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Test',
    modelType: 'direct_capitalization',
    briefReasoning: {
      summary: 'test',
      decisions: [],
      flaggedItems: [],
      overallConfidence: 1,
    },
    customModel: {
      userInput: {
        revenueItems: [],
        expenseItems: [],
        valuationInputs: {
          capRate: {
            value: 0.065,
            source: {
              sourceType: 'user_input',
              reference: { key: 'capRate' },
              displayPath: '',
              timestamp,
            },
          },
        },
      },
      calculations: {
        revenue: {
          grossPotentialIncome: {
            value: 0,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: { sourceType: 'calculated', reference: {}, displayPath: '', timestamp },
          },
          effectiveGrossIncome: {
            value: 0,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: { sourceType: 'calculated', reference: {}, displayPath: '', timestamp },
          },
        },
        expenses: {
          totalOperatingExpenses: {
            value: 0,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: { sourceType: 'calculated', reference: {}, displayPath: '', timestamp },
          },
        },
        income: {
          netOperatingIncome: {
            value: 0,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: { sourceType: 'calculated', reference: {}, displayPath: '', timestamp },
          },
        },
        valuation: {
          // Missing propertyValue - should be required for DirectCap
        },
      },
      types: {},
    },
    metadata: { modelVersion: '1.0', createdAt: timestamp },
  };

  const result = directCapitalizationModelOutputSchema.safeParse(model);
  if (result.success) {
    throw new Error('Should reject DirectCap model without propertyValue in calculations');
  }
});

// Summary
console.log('\n' + '='.repeat(50));
if (errorCount === 0) {
  console.log('✅ All type/schema consistency tests passed!');
} else {
  console.error(`❌ ${errorCount} test(s) failed`);
  process.exit(1);
}
