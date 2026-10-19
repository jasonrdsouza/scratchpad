/**
 * Executor Base Class - Abstract interface for language executors
 *
 * Provides the standard interface that all language executors must implement.
 */

/**
 * Abstract base class for language executors
 */
export class Executor {
    constructor(language) {
        this.language = language;
    }

    /**
     * Execute code and return raw result
     * @param {string} code - Code to execute
     * @returns {Promise<any>} Raw execution result
     * @throws {Error} If execution fails
     */
    async execute(code) {
        throw new Error(`Execute method not implemented for ${this.language}`);
    }

    /**
     * Get display name for this executor
     * @returns {string} Display name
     */
    getDisplayName() {
        return this.language;
    }
}

/**
 * Result wrapper for executors that capture printed output (e.g. Python's
 * print) alongside the value of the last expression
 */
export class OutputResult {
    /**
     * @param {string} output - Captured printed output
     * @param {any} value - Value of the last expression, if any
     */
    constructor(output, value) {
        this.output = output;
        this.value = value;
    }
}
