/**
 * JavaScript Executor - Handles JavaScript code execution in browser context
 *
 * Implements the Executor interface for JavaScript code execution using eval().
 * Provides safe execution with proper error handling and result processing.
 */

import { Executor } from "./executor.js";
import { getResultsRegister } from "./registers.js";

/**
 * JavaScript code executor using browser's eval() function
 */
export class JavaScriptExecutor extends Executor {
    constructor() {
        super("JavaScript");
    }

    /**
     * Execute JavaScript code safely in browser context
     * @param {string} code - JavaScript code to execute
     * @returns {Promise<any>} Raw execution result
     * @throws {Error} If execution fails
     */
    async execute(code) {
        if (!code || typeof code !== "string") {
            throw new Error("Invalid code: expected non-empty string");
        }

        try {
            // Create a safe execution context
            // Note: Using eval() in browser context - this is intentional for a scratchpad tool
            const result = eval(code);

            // Handle async results (promises)
            if (result && typeof result.then === "function") {
                return await result;
            }

            return result;
        } catch (error) {
            // Re-throw with more context
            throw new Error(`JavaScript execution failed: ${error.message}`);
        }
    }

    /**
     * Get display name for this executor
     * @returns {string} Display name
     */
    getDisplayName() {
        return "JavaScript";
    }

}

// Export convenience instance
export const javascriptExecutor = new JavaScriptExecutor();
