/**
 * Text Formatting Utilities
 *
 * Provides various text formatting functions for the :fmt command.
 * Supports JSON pretty-printing with alphabetized keys and other formats.
 */

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
        throw new Error("No text to format");
    }

    try {
        // Parse the JSON
        const parsed = JSON.parse(jsonText);

        // Recursively sort object keys
        const sortedObj = sortObjectKeys(parsed);

        // Pretty print with 4-space indentation
        return JSON.stringify(sortedObj, null, 4);
    } catch (error) {
        throw new Error(`Invalid JSON: ${error.message}`);
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
 * Auto-detect format type from content
 * @param {string} text - Text to analyze
 * @returns {string} Detected format type
 */
export function detectFormat(text) {
    text = text.trim();

    // JSON detection
    if (
        (text.startsWith("{") && text.endsWith("}")) ||
        (text.startsWith("[") && text.endsWith("]"))
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
        default:
            throw new Error(
                `Unsupported format type: ${detectedFormat}. Currently only 'json' is supported.`
            );
    }

    return {
        text: formattedText,
        format: detectedFormat
    };
}
