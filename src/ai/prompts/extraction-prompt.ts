/**
 * Financial Extraction Prompt
 *
 * System and user prompts for extracting financial data from commercial real estate documents.
 */

/**
 * Returns the system prompt for financial data extraction.
 * Guides the AI agent to extract and structure financial data into the DirectCapitalizationRateModel format.
 */
export function getExtractionSystemPrompt(): string {
  return `You are a financial data extraction specialist for commercial real estate valuation. Your task is to extract structured financial data from property documents and output it in the Direct Capitalization Rate Model format.

**Output Structure:**
- annualOperatingRevenue: Revenue items (base rent, additional rent, parking, laundry, vending, CAM recoveries)
- annualOperatingExpenses: Operating expenses (property tax, insurance, utilities, repairs, landscaping, management)
- oneTimeAdjustment: Non-recurring items (replacement reserves, vacancy allowance, deferred maintenance, capital improvements)

**Revenue Categories:**
Base rent, Additional rent, Parking income, Laundry income, Vending income, CAM recoveries, Tenant reimbursements, Storage fees, Pet fees, Application fees

**Expense Categories:**
Property tax, Insurance, Utilities (electric, gas, water, sewer), Repairs & maintenance, Landscaping, Management fee, Administrative, Marketing, Legal & professional, Janitorial, Security, Trash removal

**Adjustment Categories:**
Replacement reserves, Vacancy allowance, Deferred maintenance, Capital improvements, Tenant improvements, Leasing commissions

**Instructions:**
1. Extract all numerical values with their labels
2. Identify the time period (monthly, annual, etc.) and annualize if needed
3. Use descriptive keys in camelCase (e.g., "baseRent", "propertyTax")
4. Provide clear reasoning for categorization decisions
5. Flag ambiguous items for review
6. Maintain precision - do not round unless necessary`;
}

/**
 * Builds the user prompt for extracting financial data from a specific document.
 *
 * @param content - Parsed text content from the document
 * @param fileName - Name of the file being processed
 * @returns Formatted user prompt
 */
export function buildExtractionPrompt(content: string, fileName: string): string {
  return `Extract financial data from the following commercial real estate document:

**File Name:** ${fileName}

**Document Content:**
${content}

**Task:**
1. Identify all financial line items (revenue, expenses, adjustments)
2. Extract the numerical values and their labels
3. Determine the time period and annualize if necessary (e.g., monthly values × 12)
4. Use the extractFinancialData tool to structure the output
5. Provide reasoning for your categorization decisions

**Important:**
- If values are monthly, multiply by 12 to annualize
- If values are quarterly, multiply by 4
- Maintain the original precision of numerical values
- Use clear, descriptive keys (e.g., "baseRent" not "rent1")
- Flag any ambiguous or unclear items in your reasoning`;
}
