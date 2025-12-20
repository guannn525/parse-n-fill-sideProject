# PARSE-N-FILL Scripts

CLI utilities for testing and development.

## extract.ts

Test revenue extraction from documents.

### Usage

```bash
npx tsx scripts/extract.ts <file-path> [property-type]
```

### Arguments

- `file-path` - Path to the document to parse (PDF, Excel, CSV, or image)
- `property-type` - Optional property type hint for better categorization

### Property Type Hints

- `multifamily` - Apartment buildings
- `office` - Office buildings
- `retail` - Shopping centers, retail
- `industrial` - Warehouses, industrial
- `mixed-use` - Mixed-use properties
- `other` - Other property types

### Examples

```bash
# Parse a PDF rent roll
npx tsx scripts/extract.ts ./test-files/rent-roll.pdf

# Parse Excel with property type hint
npx tsx scripts/extract.ts ./test-files/rent-roll.xlsx multifamily

# Parse CSV
npx tsx scripts/extract.ts ./test-files/rent-roll.csv office

# Parse image
npx tsx scripts/extract.ts ./test-files/rent-roll.jpg retail
```

### Output

The script will:

1. Parse the document
2. Extract revenue streams using AI
3. Print detailed results to console
4. Save JSON output to `output/<filename>.json`

### Environment Variables

Required:

- `GOOGLE_GENERATIVE_AI_API_KEY` - Your Google AI API key

Optional:

- `DEBUG=1` - Show detailed error stack traces
- `GEMINI_MODEL` - Override default model (default: `gemini-3-flash-preview`, or `gemini-2.0-pro-exp` for complex docs)

### Example Output

```
============================================================
PARSE-N-FILL Revenue Extraction CLI
============================================================

File:          rent-roll.pdf
Path:          /path/to/rent-roll.pdf
MIME Type:     application/pdf
Property Type: multifamily

============================================================

Step 1: Reading file...
  File size: 245.67 KB

Step 2: Parsing document...
  Parsing completed in 1523ms
  Raw text length: 12456 chars
  Pages: 3

Step 3: Extracting revenue streams with AI...
  Extraction completed in 2847ms

============================================================
EXTRACTION RESULTS
============================================================

Success:    true
Confidence: 95.2%
Streams:    3

Revenue Streams:
  1. Apartment Rents (Residential) - 24 units (2 vacant)
  2. Parking (Miscellaneous) - 24 units (3 vacant)
  3. Storage (Miscellaneous) - 12 units (1 vacant)

Reasoning:
  Successfully extracted 3 revenue streams with high confidence...

============================================================
OUTPUT SAVED
============================================================

File: /path/to/output/rent-roll.json

============================================================
SUMMARY
============================================================

Total processing time: 4370ms
  - Parsing:    1523ms
  - Extraction: 2847ms
```
