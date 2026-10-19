/**
 * Execution Engine - Central coordinator for multi-language code execution
 *
 * Provides a unified interface for executing code in different languages,
 * with consistent result formatting and register storage.
 */

import { formatResult } from "./formatters.js";
import { storeResult } from "./registers.js";
import { JavaScriptExecutor } from "./javascript.js";
import { PythonExecutor } from "./python.js";
import { DEFAULTS, ERROR_MESSAGES } from "../config.js";

/**
 * Main execution engine that coordinates different language executors
 */
export class ExecutionEngine {
    constructor() {
        this.executors = new Map();
        this.languages = [];
        this.defaultLanguage = null;

        // Register built-in executors
        this.registerExecutor("javascript", new JavaScriptExecutor(), ["js"]);
        this.registerExecutor("python", new PythonExecutor(), ["py"]);
        this.setDefaultLanguage(DEFAULTS.EXECUTION_LANGUAGE);
    }

    /**
     * Register a new language executor
     * @param {string} language - Language identifier
     * @param {Executor} executor - Executor instance
     * @param {string[]} aliases - Alternative identifiers for the same executor
     */
    registerExecutor(language, executor, aliases = []) {
        this.languages.push(language.toLowerCase());
        for (const name of [language, ...aliases]) {
            this.executors.set(name.toLowerCase(), executor);
        }
    }

    /**
     * Set the default language for execution
     * @param {string} language - Language identifier
     */
    setDefaultLanguage(language) {
        if (this.executors.has(language.toLowerCase())) {
            this.defaultLanguage = language.toLowerCase();
        } else {
            throw new Error(ERROR_MESSAGES.UNSUPPORTED_LANGUAGE(language));
        }
    }

    /**
     * Get list of supported languages (excluding aliases)
     * @returns {string[]} Array of language names
     */
    getSupportedLanguages() {
        return [...this.languages];
    }

    /**
     * Execute code with automatic language detection or explicit language
     * @param {string} code - Code to execute
     * @param {string} language - Optional language override
     * @returns {Promise<Object>} Execution result with formatted output
     */
    async execute(code, language = null) {
        try {
            // Determine which executor to use
            const executorKey = language?.toLowerCase() || this.defaultLanguage;
            const executor = this.executors.get(executorKey);

            if (!executor) {
                throw new Error(
                    ERROR_MESSAGES.UNSUPPORTED_LANGUAGE(language || "default")
                );
            }

            console.log(`Executing ${executor.getDisplayName()} code:`, code);

            // Execute the code
            const rawResult = await executor.execute(code);

            // Format the result for display
            const formattedResult = formatResult(rawResult);

            // Store result in register
            storeResult(formattedResult);

            // Return structured result
            return {
                success: true,
                rawResult,
                formattedResult,
                language: executor.getDisplayName(),
                executor: executorKey
            };
        } catch (error) {
            console.error(`Execution error:`, error);

            return {
                success: false,
                error: error.message,
                language: language || this.defaultLanguage,
                formattedResult: `Error: ${error.message}`
            };
        }
    }
}

// Create and export default engine instance
export const executionEngine = new ExecutionEngine();
