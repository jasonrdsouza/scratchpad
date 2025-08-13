/**
 * Text Formatting Utilities
 *
 * Provides various text formatting functions for the :fmt command.
 * Supports JSON pretty-printing with alphabetized keys and other formats.
 */

import { FORMAT_PATTERNS, HELP, ERROR_MESSAGES } from "./config.js";

/**
 * Format JSON with pretty printing and alphabetized keys
 * @param {string} jsonText - JSON text to format
 * @returns {string} Formatted JSON string
 * @throws {Error} If JSON is invalid
 */
export function formatJSON(jsonText) {
    // Trim whitespace
    jsonText = jsonText.trim();

    if (!jsonText) {
        throw new Error(
            ERROR_MESSAGES.NO_TEXT_TO_FORMAT || "No text to format"
        );
    }

    try {
        // Parse the JSON
        const parsed = JSON.parse(jsonText);

        // Recursively sort object keys
        const sortedObj = sortObjectKeys(parsed);

        // Pretty print with 4-space indentation
        return JSON.stringify(sortedObj, null, 4);
    } catch (error) {
        throw new Error(ERROR_MESSAGES.INVALID_JSON(error.message));
    }
}

/**
 * Recursively sort object keys alphabetically
 * @param {any} obj - Object to sort keys for
 * @returns {any} Object with sorted keys
 */
function sortObjectKeys(obj) {
    if (Array.isArray(obj)) {
        // For arrays, recursively sort keys in each element
        return obj.map((item) => sortObjectKeys(item));
    } else if (obj !== null && typeof obj === "object") {
        // For objects, sort keys and recursively sort values
        const sortedObj = {};
        const sortedKeys = Object.keys(obj).sort();

        for (const key of sortedKeys) {
            sortedObj[key] = sortObjectKeys(obj[key]);
        }

        return sortedObj;
    } else {
        // For primitives, return as-is
        return obj;
    }
}

/**
 * Format text by cleaning up whitespace and normalizing line endings
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
export function formatClean(text) {
    if (!text) {
        return text;
    }

    // Split into lines for processing
    let lines = text.split(/\r?\n/);

    // Clean each line
    lines = lines.map((line) => {
        // Remove trailing whitespace
        return line.replace(/\s+$/, "");
    });

    // Remove trailing empty lines
    while (lines.length > 0 && lines[lines.length - 1] === "") {
        lines.pop();
    }

    // Join with consistent line endings (LF)
    return lines.join("\n");
}

/**
 * Format tabular data as an ASCII table with aligned columns
 * @param {string} text - CSV/TSV text to format
 * @returns {string} Formatted ASCII table
 */
export function formatTable(text) {
    if (!text || !text.trim()) {
        throw new Error(
            ERROR_MESSAGES.NO_TEXT_TO_FORMAT || "No text to format as table"
        );
    }

    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0) {
        throw new Error(
            ERROR_MESSAGES.NO_DATA_TO_FORMAT || "No data to format as table"
        );
    }

    // Auto-detect delimiter
    const delimiter = detectDelimiter(lines[0]);

    // Parse all rows
    const rows = lines.map((line) => {
        return line.split(delimiter).map((cell) => cell.trim());
    });

    // Ensure all rows have the same number of columns
    const maxColumns = Math.max(...rows.map((row) => row.length));
    rows.forEach((row) => {
        while (row.length < maxColumns) {
            row.push("");
        }
    });

    // Calculate column widths
    const columnWidths = [];
    for (let col = 0; col < maxColumns; col++) {
        let maxWidth = 0;
        for (let row = 0; row < rows.length; row++) {
            const cellWidth = String(rows[row][col] || "").length;
            maxWidth = Math.max(maxWidth, cellWidth);
        }
        columnWidths[col] = Math.max(maxWidth, HELP.MIN_TABLE_COLUMN_WIDTH);
    }

    // Build the table
    const tableLines = [];

    // Header row
    if (rows.length > 0) {
        const headerRow = rows[0];
        const headerLine =
            "| " +
            headerRow
                .map((cell, i) => String(cell || "").padEnd(columnWidths[i]))
                .join(" | ") +
            " |";

        tableLines.push(headerLine);

        // Header separator
        const separatorLine =
            "|" +
            columnWidths.map((width) => "-".repeat(width + 2)).join("|") +
            "|";

        tableLines.push(separatorLine);

        // Data rows
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const rowLine =
                "| " +
                row
                    .map((cell, j) =>
                        String(cell || "").padEnd(columnWidths[j])
                    )
                    .join(" | ") +
                " |";

            tableLines.push(rowLine);
        }
    }

    return tableLines.join("\n");
}

/**
 * Auto-detect the delimiter used in tabular data
 * @param {string} firstLine - First line of data to analyze
 * @returns {string} Detected delimiter
 */
function detectDelimiter(firstLine) {
    // Count potential delimiters
    const delimiters = FORMAT_PATTERNS.CSV_DELIMITERS;
    const counts = delimiters.map(
        (d) => (firstLine.match(new RegExp(`\\${d}`, "g")) || []).length
    );
    const [commas, tabs, pipes, semicolons] = counts;

    // Return the most common delimiter
    if (tabs > 0 && tabs >= commas) return "\t";
    if (pipes > 0 && pipes >= commas) return "|";
    if (semicolons > 0 && semicolons >= commas) return ";";
    if (commas > 0) return ",";

    // Fall back to multiple spaces if no clear delimiter
    if (firstLine.match(FORMAT_PATTERNS.MULTI_SPACE_REGEX)) {
        return FORMAT_PATTERNS.MULTI_SPACE_REGEX; // Multiple spaces regex
    }

    // Default to comma
    return ",";
}

/**
 * Auto-detect format type from content
 * @param {string} text - Text to analyze
 * @returns {string} Detected format type
 */
export function detectFormat(text) {
    text = text.trim();

    // JSON detection
    if (
        FORMAT_PATTERNS.JSON.START_PATTERNS.some((p) => text.startsWith(p)) &&
        FORMAT_PATTERNS.JSON.END_PATTERNS.some((p) => text.endsWith(p))
    ) {
        try {
            JSON.parse(text);
            return "json";
        } catch (error) {
            // Not valid JSON, continue checking other formats
        }
    }

    // Default to unknown for now
    return "unknown";
}

/**
 * Main formatting dispatch function
 * @param {string} text - Text to format
 * @param {string} formatType - Format type ('json', 'auto', etc.)
 * @returns {Object} Result with formatted text and detected format
 * @throws {Error} If formatting fails
 */
export function formatText(text, formatType = "auto") {
    let detectedFormat = formatType;

    if (formatType === "auto") {
        detectedFormat = detectFormat(text);
    }

    let formattedText;

    switch (detectedFormat.toLowerCase()) {
        case "json":
            formattedText = formatJSON(text);
            break;
        case "clean":
            formattedText = formatClean(text);
            break;
        case "table":
            formattedText = formatTable(text);
            break;
        default:
            throw new Error(ERROR_MESSAGES.UNSUPPORTED_FORMAT(detectedFormat));
    }

    return {
        text: formattedText,
        format: detectedFormat
    };
}
