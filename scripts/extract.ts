/**
 * CLI script to test revenue extraction
 *
 * Usage: npx tsx scripts/extract.ts <file-path> [property-type]
 *
 * Examples:
 *   npx tsx scripts/extract.ts ./test-files/rent-roll.pdf
 *   npx tsx scripts/extract.ts ./test-files/rent-roll.xlsx multifamily
 *
 * Property types: multifamily, office, retail, industrial, mixed-use, other
 */

import fs from "fs";
import path from "path";
import { parseFile } from "../src/parsers";
import { extractRevenueStreams } from "../src/ai/tools/extract-revenue-streams";
import { getMimeTypeFromExtension } from "../src/lib/constants";

/**
 * Display usage information
 */
function showUsage(): void {
  console.log(`
Usage: npx tsx scripts/extract.ts <file-path> [property-type]

Arguments:
  file-path       Path to the document to parse (PDF, Excel, CSV, or image)
  property-type   Optional property type hint (multifamily, office, retail, etc.)

Examples:
  npx tsx scripts/extract.ts ./test-files/rent-roll.pdf
  npx tsx scripts/extract.ts ./test-files/rent-roll.xlsx multifamily
  npx tsx scripts/extract.ts ./test-files/rent-roll.csv office

Supported file types:
  - PDF (.pdf)
  - Excel (.xlsx, .xls)
  - CSV (.csv)
  - Images (.png, .jpg, .jpeg, .webp)

Property type hints:
  - multifamily (apartment buildings)
  - office (office buildings)
  - retail (shopping centers, retail)
  - industrial (warehouses, industrial)
  - mixed-use (mixed-use properties)
  - other (other property types)

Output:
  - JSON printed to console
  - Result saved to output/<filename>.json
`);
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const filePath = process.argv[2];
  const propertyType = process.argv[3];

  // Validate arguments
  if (!filePath) {
    console.error("Error: Missing required argument <file-path>\n");
    showUsage();
    process.exit(1);
  }

  // Resolve absolute path
  const absolutePath = path.resolve(process.cwd(), filePath);

  // Check if file exists
  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: File not found: ${absolutePath}`);
    process.exit(1);
  }

  // Get file name and extension
  const fileName = path.basename(absolutePath);
  const fileExt = path.extname(absolutePath);

  // Detect MIME type from extension
  const mimeType = getMimeTypeFromExtension(fileExt);
  if (!mimeType) {
    console.error(`Error: Unsupported file type: ${fileExt}`);
    console.error("Supported types: .pdf, .xlsx, .xls, .csv, .png, .jpg, .jpeg, .webp");
    process.exit(1);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("PARSE-N-FILL Revenue Extraction CLI");
  console.log(`${"=".repeat(60)}\n`);
  console.log(`File:          ${fileName}`);
  console.log(`Path:          ${absolutePath}`);
  console.log(`MIME Type:     ${mimeType}`);
  if (propertyType) {
    console.log(`Property Type: ${propertyType}`);
  }
  console.log(`\n${"=".repeat(60)}\n`);

  try {
    // Step 1: Read file as Buffer
    console.log("Step 1: Reading file...");
    const fileBuffer = fs.readFileSync(absolutePath);
    console.log(`  File size: ${(fileBuffer.length / 1024).toFixed(2)} KB\n`);

    // Step 2: Parse document
    console.log("Step 2: Parsing document...");
    const startParse = Date.now();
    const parsedContent = await parseFile(fileBuffer, mimeType, fileName);
    const parseDuration = Date.now() - startParse;
    console.log(`  Parsing completed in ${parseDuration}ms`);
    console.log(`  Raw text length: ${parsedContent.rawText.length} chars`);
    if (parsedContent.metadata.pageCount) {
      console.log(`  Pages: ${parsedContent.metadata.pageCount}`);
    }
    if (parsedContent.metadata.sheetNames?.length) {
      console.log(`  Sheets: ${parsedContent.metadata.sheetNames.length}`);
    }
    console.log();

    // Step 3: Extract revenue streams
    console.log("Step 3: Extracting revenue streams with AI...");
    const startExtract = Date.now();
    const result = await extractRevenueStreams.execute({
      rawText: parsedContent.rawText,
      structuredData: parsedContent.structuredData,
      fileName,
      propertyTypeHint: propertyType,
    });
    const extractDuration = Date.now() - startExtract;
    console.log(`  Extraction completed in ${extractDuration}ms\n`);

    // Step 4: Display results
    console.log(`${"=".repeat(60)}`);
    console.log("EXTRACTION RESULTS");
    console.log(`${"=".repeat(60)}\n`);

    if (!result.success) {
      console.error("Extraction failed:");
      console.error(`  Error: ${result.error}\n`);
      process.exit(1);
    }

    console.log(`Success:    ${result.success}`);
    console.log(`Confidence: ${(result.overallConfidence * 100).toFixed(1)}%`);
    console.log(`Streams:    ${result.revenueStreams.length}`);
    console.log();

    if (result.warnings && result.warnings.length > 0) {
      console.log("Warnings:");
      result.warnings.forEach((warning) => {
        console.log(`  - ${warning}`);
      });
      console.log();
    }

    // Display stream summary
    if (result.revenueStreams.length > 0) {
      console.log("Revenue Streams:");
      result.revenueStreams.forEach((stream, idx) => {
        const totalRows = stream.rows.length;
        const vacantRows = stream.rows.filter((r) => r.isVacant).length;
        console.log(
          `  ${idx + 1}. ${stream.name} (${stream.category}) - ${totalRows} units (${vacantRows} vacant)`
        );
      });
      console.log();
    }

    if (result.reasoning) {
      console.log("Reasoning:");
      console.log(`  ${result.reasoning}\n`);
    }

    // Step 5: Pretty-print JSON to console
    console.log(`${"=".repeat(60)}`);
    console.log("FULL JSON OUTPUT");
    console.log(`${"=".repeat(60)}\n`);
    console.log(JSON.stringify(result, null, 2));
    console.log();

    // Step 6: Write to output file
    const outputDir = path.join(process.cwd(), "output");
    const outputFileName = `${path.basename(fileName, fileExt)}.json`;
    const outputPath = path.join(outputDir, outputFileName);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");

    console.log(`${"=".repeat(60)}`);
    console.log("OUTPUT SAVED");
    console.log(`${"=".repeat(60)}\n`);
    console.log(`File: ${outputPath}\n`);

    // Summary
    const totalDuration = parseDuration + extractDuration;
    console.log(`${"=".repeat(60)}`);
    console.log("SUMMARY");
    console.log(`${"=".repeat(60)}\n`);
    console.log(`Total processing time: ${totalDuration}ms`);
    console.log(`  - Parsing:    ${parseDuration}ms`);
    console.log(`  - Extraction: ${extractDuration}ms`);
    console.log();

    process.exit(0);
  } catch (error) {
    console.error("\nError during extraction:");
    if (error instanceof Error) {
      console.error(`  ${error.message}`);
      if (process.env.DEBUG) {
        console.error("\nStack trace:");
        console.error(error.stack);
      }
    } else {
      console.error(`  ${String(error)}`);
    }
    console.error("\nTip: Set DEBUG=1 environment variable for detailed error information");
    process.exit(1);
  }
}

// Run the script
main();
