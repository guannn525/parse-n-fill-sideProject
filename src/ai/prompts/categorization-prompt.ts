/**
 * Categorization Prompt
 *
 * System and user prompts for categorizing financial line items into revenue, expenses, or adjustments.
 */

/**
 * Line item structure for categorization
 */
export interface LineItem {
  label: string;
  value: number;
  context?: string;
}

/**
 * Returns the system prompt for line item categorization.
 * Guides the AI agent to categorize financial line items correctly.
 */
export function getCategorizationSystemPrompt(): string {
  return `You are a financial categorization specialist for commercial real estate. Your task is to categorize line items into revenue, expenses, or one-time adjustments following standard appraisal practices.

**Category Definitions:**

REVENUE (annualOperatingRevenue):
- Base rent: Primary rental income from tenants
- Additional rent: Percentage rent, overage rent
- Parking income: Parking fees, garage revenue
- Laundry income: Coin-operated laundry
- Vending income: Vending machines
- CAM recoveries: Common Area Maintenance reimbursements
- Tenant reimbursements: Utility reimbursements, tax reimbursements
- Storage fees: Storage unit rental
- Pet fees: Pet rent or deposits (recurring only)
- Application fees: Recurring application revenue

EXPENSES (annualOperatingExpenses):
- Property tax: Real estate taxes
- Insurance: Property insurance, liability insurance
- Utilities: Electric, gas, water, sewer (owner-paid)
- Repairs & maintenance: Routine repairs, HVAC maintenance
- Landscaping: Lawn care, snow removal
- Management fee: Property management services
- Administrative: Office supplies, accounting
- Marketing: Advertising, leasing costs (ongoing)
- Legal & professional: Recurring legal/accounting fees
- Janitorial: Cleaning services
- Security: Security services, alarm monitoring
- Trash removal: Waste management services

ADJUSTMENTS (oneTimeAdjustment):
- Replacement reserves: Capital reserves for future replacements
- Vacancy allowance: Market vacancy and credit loss allowance
- Deferred maintenance: Backlog of needed repairs
- Capital improvements: Major upgrades (roof, HVAC, etc.)
- Tenant improvements: Buildout costs for new tenants
- Leasing commissions: One-time broker fees

**Rules:**
1. Categorize based on economic substance, not just the label
2. Recurring items → Revenue or Expenses
3. Non-recurring or reserve items → Adjustments
4. When uncertain, explain your reasoning and flag for review`;
}

/**
 * Builds the user prompt for categorizing a list of line items.
 *
 * @param lineItems - Array of line items to categorize
 * @returns Formatted user prompt
 */
export function buildCategorizationPrompt(lineItems: LineItem[]): string {
  const itemsList = lineItems
    .map((item, index) => {
      const contextStr = item.context ? ` (Context: ${item.context})` : '';
      return `${index + 1}. ${item.label}: $${item.value.toLocaleString()}${contextStr}`;
    })
    .join('\n');

  return `Categorize the following financial line items into revenue, expenses, or adjustments:

**Line Items:**
${itemsList}

**Task:**
1. Analyze each line item
2. Determine if it is revenue, expense, or adjustment
3. Use the categorizeLineItems tool to structure the output
4. Provide reasoning for any non-obvious categorizations

**Remember:**
- Recurring income → Revenue
- Recurring costs → Expenses
- Non-recurring, reserves, or allowances → Adjustments
- Explain your reasoning for ambiguous items`;
}
