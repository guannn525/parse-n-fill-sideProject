/**
 * Revenue Stream Extraction Prompt
 *
 * System and user prompts for extracting rent roll data into RevenueStream[] format.
 */

/**
 * Returns the system prompt for revenue stream extraction.
 * Guides the AI agent to extract unit-level rent roll data.
 */
export function getRevenueStreamSystemPrompt(): string {
  return `You are a rent roll analyst for commercial real estate. Extract unit-level revenue data into RevenueStream[] format.

**Output Structure:**
- RevenueStream[]: Array of categorized revenue streams
  - id: Generate a unique identifier (e.g., "stream-1")
  - name: Descriptive name (e.g., "Office Rents", "Retail Rents", "Parking")
  - category: Residential | Commercial | Miscellaneous
  - order: Display order starting at 1
  - rows: Array of RevenueRow (unit-level data)

**Categories:**
- RESIDENTIAL: Apartments, units, multifamily, residential rentals
- COMMERCIAL: Office, retail, industrial, flex, warehouse, medical
- MISCELLANEOUS: Parking, storage, laundry, vending, antenna, billboard, other

**RevenueRow Fields:**
- id: Generate a unique identifier (e.g., "row-1")
- unit: Unit identifier (Apt 1A, Suite 200, Space 101)
- squareFeet: Rentable square footage (null if not available)
- monthlyRate: Monthly rent amount (null if only annual is shown)
- annualIncome: Annual income amount (null if only monthly is shown)
- isVacant: true if unit has no tenant or no rent

**Guidelines:**
1. Extract ALL units/spaces from the document
2. Group units into logical revenue streams by type
3. Extract monthlyRate if monthly values are shown
4. Extract annualIncome if annual values are shown
5. Extract BOTH if both are shown in the document
6. Mark isVacant=true if: no tenant name, no rent, or explicitly marked vacant
7. Use null for missing values, not 0`;
}

/**
 * Builds the user prompt for extracting revenue streams from a specific document.
 *
 * @param content - Parsed text content from the document
 * @param fileName - Name of the file being processed
 * @param propertyTypeHint - Optional hint about property type
 * @returns Formatted user prompt
 */
export function buildRevenueStreamPrompt(
  content: string,
  fileName: string,
  propertyTypeHint?: string
): string {
  let prompt = `Extract all revenue data from this rent roll into RevenueStream[] format.

**Document:** ${fileName}
${propertyTypeHint && propertyTypeHint !== "unknown" ? `**Property Type:** ${propertyTypeHint}` : ""}

**Content:**
${content}

**Instructions:**
1. Identify all unit/lease records in the document
2. Extract for each unit: unit ID, square feet, monthly rent, annual rent
3. Determine if each unit is vacant (no tenant or no rent = vacant)
4. Group rows into streams by category (Residential/Commercial/Miscellaneous)
5. Name streams descriptively based on the content (e.g., "Office Rents", "Parking Income")

**Important:**
- Every row with a unit identifier should become a RevenueRow
- Extract monthlyRate if the document shows monthly figures
- Extract annualIncome if the document shows annual figures
- If both are shown, extract both
- Use null for missing numeric values, not 0
- Provide reasoning explaining your categorization decisions`;

  return prompt;
}
