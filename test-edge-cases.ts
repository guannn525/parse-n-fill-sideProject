/**
 * Test edge cases and potential runtime errors
 */

import {
  type CustomFinancialModelOutput,
  customFinancialModelOutputSchema,
  parseSourceNotation,
  validateSourceNotation,
  toOtherBranchFormat,
  directCapFormulas,
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

console.log('Testing Edge Cases and Error Handling\n');

// Test 1: Invalid schema data
console.log('=== Test 1: Schema Validation Errors ===');

testCase('Reject invalid UUID', () => {
  const result = customFinancialModelOutputSchema.safeParse({
    id: 'not-a-uuid',
    title: 'Test',
    modelType: 'direct_capitalization',
    briefReasoning: {
      summary: 'test',
      decisions: [],
      flaggedItems: [],
      overallConfidence: 0.5,
    },
    customModel: {
      userInput: { revenueItems: [], expenseItems: [] },
      calculations: {
        revenue: {
          grossPotentialIncome: {
            value: null,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: {
              sourceType: 'calculated',
              reference: {},
              displayPath: '',
              timestamp: new Date().toISOString(),
            },
          },
          effectiveGrossIncome: {
            value: null,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: {
              sourceType: 'calculated',
              reference: {},
              displayPath: '',
              timestamp: new Date().toISOString(),
            },
          },
        },
        expenses: {
          totalOperatingExpenses: {
            value: null,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: {
              sourceType: 'calculated',
              reference: {},
              displayPath: '',
              timestamp: new Date().toISOString(),
            },
          },
        },
        income: {
          netOperatingIncome: {
            value: null,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: {
              sourceType: 'calculated',
              reference: {},
              displayPath: '',
              timestamp: new Date().toISOString(),
            },
          },
        },
      },
      types: {},
    },
    metadata: { modelVersion: '1.0', createdAt: new Date().toISOString() },
  });
  if (result.success) {
    throw new Error('Should have rejected invalid UUID');
  }
});

testCase('Reject confidence > 1', () => {
  const timestamp = new Date().toISOString();
  const result = customFinancialModelOutputSchema.safeParse({
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Test',
    modelType: 'direct_capitalization',
    briefReasoning: {
      summary: 'test',
      decisions: [],
      flaggedItems: [],
      overallConfidence: 1.5, // Invalid
    },
    customModel: {
      userInput: { revenueItems: [], expenseItems: [] },
      calculations: {
        revenue: {
          grossPotentialIncome: {
            value: null,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: { sourceType: 'calculated', reference: {}, displayPath: '', timestamp },
          },
          effectiveGrossIncome: {
            value: null,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: { sourceType: 'calculated', reference: {}, displayPath: '', timestamp },
          },
        },
        expenses: {
          totalOperatingExpenses: {
            value: null,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: { sourceType: 'calculated', reference: {}, displayPath: '', timestamp },
          },
        },
        income: {
          netOperatingIncome: {
            value: null,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: { sourceType: 'calculated', reference: {}, displayPath: '', timestamp },
          },
        },
      },
      types: {},
    },
    metadata: { modelVersion: '1.0', createdAt: timestamp },
  });
  if (result.success) {
    throw new Error('Should have rejected confidence > 1');
  }
});

// Test 2: Source notation edge cases
console.log('\n=== Test 2: Source Notation Edge Cases ===');

testCase('Parse empty string', () => {
  const segments = parseSourceNotation('');
  if (segments.length !== 0) {
    throw new Error(`Expected 0 segments, got ${segments.length}`);
  }
});

testCase('Parse text without notation', () => {
  const segments = parseSourceNotation('Just plain text');
  if (segments.length !== 1 || segments[0].type !== 'text') {
    throw new Error('Should return single text segment');
  }
});

testCase('Parse multiple references', () => {
  const text = '${val1, tooltip:userInput-key:a} and ${val2, tooltip:calculated-index:0}';
  const segments = parseSourceNotation(text);
  const refCount = segments.filter(s => s.type === 'reference').length;
  if (refCount !== 2) {
    throw new Error(`Expected 2 references, got ${refCount}`);
  }
});

testCase('Validate malformed notation', () => {
  const result = validateSourceNotation('${incomplete');
  if (result.isValid) {
    throw new Error('Should detect unclosed brace');
  }
});

testCase('Validate invalid source type', () => {
  const result = validateSourceNotation('${val, tooltip:invalidType-key:test}');
  if (result.isValid) {
    throw new Error('Should detect invalid source type');
  }
});

// Test 3: Formula edge cases
console.log('\n=== Test 3: Formula Execution Edge Cases ===');

testCase('Handle null inputs', () => {
  const formula = directCapFormulas.find(f => f.id === 'netOperatingIncome');
  if (!formula) throw new Error('Formula not found');
  const result = formula.compute({ effectiveGrossIncome: null, totalOperatingExpenses: 1000 });
  if (result !== null) {
    throw new Error('Should return null when EGI is null');
  }
});

testCase('Handle missing inputs', () => {
  const formula = directCapFormulas.find(f => f.id === 'propertyValue');
  if (!formula) throw new Error('Formula not found');
  const result = formula.compute({ netOperatingIncome: 100000, capRate: null });
  if (result !== null) {
    throw new Error('Should return null when cap rate is null');
  }
});

testCase('Handle zero division', () => {
  const formula = directCapFormulas.find(f => f.id === 'propertyValue');
  if (!formula) throw new Error('Formula not found');
  const result = formula.compute({ netOperatingIncome: 100000, capRate: 0 });
  if (result !== null) {
    throw new Error('Should return null when cap rate is 0 (division by zero)');
  }
});

testCase('Validate expense ratio warning', () => {
  const formula = directCapFormulas.find(f => f.id === 'expenseRatio');
  if (!formula || !formula.validate) throw new Error('Formula or validate not found');
  const result = formula.validate(75);
  if (result.severity !== 'warning') {
    throw new Error('Should warn when expense ratio > 70%');
  }
});

testCase('Validate NOI negative warning', () => {
  const formula = directCapFormulas.find(f => f.id === 'netOperatingIncome');
  if (!formula || !formula.validate) throw new Error('Formula or validate not found');
  const result = formula.validate(-5000);
  if (result.severity !== 'warning') {
    throw new Error('Should warn when NOI is negative');
  }
});

// Test 4: Converter edge cases
console.log('\n=== Test 4: Converter Edge Cases ===');

testCase('Convert with empty items', () => {
  const timestamp = new Date().toISOString();
  const emptyModel: CustomFinancialModelOutput = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Empty',
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
      },
      types: {},
    },
    metadata: { modelVersion: '1.0', createdAt: timestamp },
  };

  const result = toOtherBranchFormat(emptyModel);
  if (result.revenueStreams[0].rows.length !== 0) {
    throw new Error('Should handle empty revenue items');
  }
  if (result.expenseRows.length !== 0) {
    throw new Error('Should handle empty expense items');
  }
});

testCase('Convert with null vacancy rate', () => {
  const timestamp = new Date().toISOString();
  const model: CustomFinancialModelOutput = {
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
        revenueItems: [
          {
            id: 'rev-1',
            label: 'Rent',
            amount: 100000,
            source: { sourceType: 'user_input', reference: {}, displayPath: '', timestamp },
          },
        ],
        expenseItems: [],
        valuationInputs: {
          vacancyRate: { value: null, source: { sourceType: 'user_input', reference: {}, displayPath: '', timestamp } },
        },
      },
      calculations: {
        revenue: {
          grossPotentialIncome: {
            value: 100000,
            formula: { displayFormula: '', expression: '', operands: [] },
            isValid: true,
            source: { sourceType: 'calculated', reference: {}, displayPath: '', timestamp },
          },
          effectiveGrossIncome: {
            value: 100000,
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
            value: 100000,
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

  const result = toOtherBranchFormat(model);
  // Should use default vacancy rate of 5
  if (result.revenueStreams[0].vacancyRate !== 5) {
    throw new Error(`Expected default vacancy rate 5, got ${result.revenueStreams[0].vacancyRate}`);
  }
});

// Summary
console.log('\n' + '='.repeat(50));
if (errorCount === 0) {
  console.log('✅ All edge case tests passed!');
} else {
  console.error(`❌ ${errorCount} test(s) failed`);
  process.exit(1);
}
