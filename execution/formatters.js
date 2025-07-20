/**
 * Result Formatters - Consistent formatting of execution results across languages
 *
 * Handles conversion of raw execution results into display-friendly strings
 * that work well in vim registers and console output.
 */

/**
 * Format any result value into a display-friendly string
 * @param {any} result - Raw result from code execution
 * @returns {string} Formatted string representation
 */
export function formatResult(result) {
    if (result === undefined) {
        return "undefined";
    }

    if (result === null) {
        return "null";
    }

    if (typeof result === "function") {
        return formatFunction(result);
    }

    if (typeof result === "object") {
        return formatObject(result);
    }

    if (typeof result === "string") {
        return formatString(result);
    }

    if (typeof result === "number") {
        return formatNumber(result);
    }

    if (typeof result === "boolean") {
        return String(result);
    }

    if (typeof result === "bigint") {
        return result.toString() + "n";
    }

    if (typeof result === "symbol") {
        return result.toString();
    }

    // Fallback for any other types
    return String(result);
}

/**
 * Format function values
 * @param {Function} fn - Function to format
 * @returns {string} Formatted function representation
 */
function formatFunction(fn) {
    // For regular functions, show the full definition
    const fnString = fn.toString();

    // If it's a short function, show it inline
    if (fnString.length < 100 && !fnString.includes("\n")) {
        return fnString;
    }

    // For longer functions, show a summary
    const match = fnString.match(/^(async\s+)?function\s*([^(]*)\s*\([^)]*\)/);
    if (match) {
        const [, asyncPrefix = "", name] = match;
        return `${asyncPrefix}function ${name || "<anonymous>"}() { ... }`;
    }

    // Arrow functions
    const arrowMatch = fnString.match(/^(async\s*)?\([^)]*\)\s*=>/);
    if (arrowMatch) {
        return fnString.length < 50
            ? fnString
            : `${arrowMatch[1] || ""}(...) => { ... }`;
    }

    return "[Function]";
}

/**
 * Format object values with pretty JSON
 * @param {Object} obj - Object to format
 * @returns {string} Formatted JSON representation
 */
function formatObject(obj) {
    try {
        // Handle arrays specially for better readability
        if (Array.isArray(obj)) {
            return formatArray(obj);
        }

        // Handle dates
        if (obj instanceof Date) {
            return obj.toISOString();
        }

        // Handle errors
        if (obj instanceof Error) {
            return `Error: ${obj.message}`;
        }

        // Handle regular objects with JSON
        return JSON.stringify(obj, null, 2);
    } catch (error) {
        // Fallback for objects that can't be JSON stringified
        return `[Object ${obj.constructor?.name || "Object"}]`;
    }
}

/**
 * Format arrays with appropriate formatting based on size and content
 * @param {Array} arr - Array to format
 * @returns {string} Formatted array representation
 */
function formatArray(arr) {
    if (arr.length === 0) {
        return "[]";
    }

    // For short arrays with simple values, format inline
    if (
        arr.length <= 5 &&
        arr.every((item) => typeof item !== "object" || item === null)
    ) {
        return JSON.stringify(arr);
    }

    // For longer or complex arrays, use pretty formatting
    return JSON.stringify(arr, null, 2);
}

/**
 * Format string values, handling special cases
 * @param {string} str - String to format
 * @returns {string} Formatted string
 */
function formatString(str) {
    // For most strings, return as-is
    // Only quote if it contains special characters that might be confusing
    if (str.includes("\n") || str.includes("\t") || str.includes('"')) {
        return JSON.stringify(str);
    }

    return str;
}

/**
 * Format numbers with appropriate precision
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
    // Handle special number values
    if (Number.isNaN(num)) {
        return "NaN";
    }

    if (!Number.isFinite(num)) {
        return num > 0 ? "Infinity" : "-Infinity";
    }

    // For very small or very large numbers, consider scientific notation
    if (Math.abs(num) > 1e10 || (Math.abs(num) < 1e-4 && num !== 0)) {
        return num.toExponential();
    }

    // For decimal numbers, limit precision to avoid floating point artifacts
    if (num % 1 !== 0) {
        // Check if it's a clean decimal or has floating point artifacts
        const str = num.toString();
        const parts = str.split(".");
        if (parts[1] && parts[1].length > 10) {
            // Likely floating point artifacts, round to reasonable precision
            return num.toPrecision(12);
        }
    }

    return num.toString();
}

/**
 * Format results specifically for console logging
 * @param {any} result - Raw result to format
 * @returns {any} Value optimized for console.log display
 */
export function formatForConsole(result) {
    // For console logging, we often want the raw object so console.log
    // can provide its own interactive inspection
    if (typeof result === "object" && result !== null) {
        return result;
    }

    // For primitives, formatted version is fine
    return formatResult(result);
}
