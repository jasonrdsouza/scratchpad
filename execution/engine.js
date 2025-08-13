/**
 * Execution Engine - Central coordinator for multi-language code execution
 *
 * Provides a unified interface for executing code in different languages,
 * with consistent result formatting and register storage.
 */

import { formatResult } from "./formatters.js";
import { storeResult } from "./registers.js";
import { Executor } from "./executor.js";
import { JavaScriptExecutor } from "./javascript.js";
import { PythonExecutor } from "./python.js";
import { DEFAULTS, ERROR_MESSAGES } from "../config.js";

/**
 * Main execution engine that coordinates different language executors
 */
export class ExecutionEngine {
    constructor() {
        this.executors = new Map();
        this.defaultLanguage = null;

        // Register built-in executors
        this.registerExecutor("javascript", new JavaScriptExecutor());
        this.registerExecutor("js", new JavaScriptExecutor()); // Alias
        this.registerExecutor("python", new PythonExecutor());
        this.registerExecutor("py", new PythonExecutor()); // Alias
        this.setDefaultLanguage(DEFAULTS.EXECUTION_LANGUAGE);
    }

    /**
     * Register a new language executor
     * @param {string} language - Language identifier
     * @param {Executor} executor - Executor instance
     */
    registerExecutor(language, executor) {
        this.executors.set(language.toLowerCase(), executor);
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
     * Get list of supported languages
     * @returns {string[]} Array of language names
     */
    getSupportedLanguages() {
        return Array.from(this.executors.keys());
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
            await storeResult(formattedResult);

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

    /**
     * Execute code from a vim register
     * @param {string} registerName - Register name, null for unnamed
     * @param {Function} getCodeFromRegister - Function to retrieve register content
     * @param {string} language - Optional language override
     * @returns {Promise<Object>} Execution result
     */
    async executeFromRegister(
        registerName,
        getCodeFromRegister,
        language = null
    ) {
        try {
            const code = getCodeFromRegister(registerName);
            if (!code || !code.trim()) {
                throw new Error(
                    registerName
                        ? ERROR_MESSAGES.REGISTER_NOT_FOUND(registerName)
                        : ERROR_MESSAGES.NO_CODE_FOUND
                );
            }
            return await this.execute(code.trim(), language);
        } catch (error) {
            return {
                success: false,
                error: error.message,
                language: language || this.defaultLanguage,
                formattedResult: error.message
            };
        }
    }
}

// Create and export default engine instance
export const executionEngine = new ExecutionEngine();

// Re-export Executor for convenience
export { Executor } from "./executor.js";
