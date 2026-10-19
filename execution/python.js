/**
 * Python Executor - Handles Python code execution using Pyodide WebAssembly
 *
 * Implements the Executor interface for Python code execution using Pyodide.
 * Provides safe execution with proper error handling and result processing.
 */

import { Executor, OutputResult } from "./executor.js";

/**
 * Convert a Python object proxy to a plain JavaScript value and release it.
 * Dicts become plain objects (not Maps); objects with no JavaScript
 * equivalent (e.g. a pandas DataFrame) fall back to their Python str().
 * @param {Object} proxy - PyProxy returned by Pyodide
 * @returns {any} JavaScript value
 */
function convertProxy(proxy) {
    try {
        return proxy.toJs({
            dict_converter: Object.fromEntries,
            create_pyproxies: false
        });
    } catch (error) {
        return proxy.toString();
    } finally {
        proxy.destroy();
    }
}

/**
 * Python code executor using Pyodide WebAssembly runtime
 */
export class PythonExecutor extends Executor {
    constructor() {
        super("Python");
        this.pyodide = null;
        this.isLoading = false;
        this.loadPromise = null;
    }

    /**
     * Initialize Pyodide runtime (lazy loading)
     * @returns {Promise<Object>} Pyodide instance
     */
    async initializePyodide() {
        if (this.pyodide) {
            return this.pyodide;
        }

        if (this.isLoading) {
            return await this.loadPromise;
        }

        this.isLoading = true;
        this.loadPromise = this._loadPyodide();

        try {
            this.pyodide = await this.loadPromise;
            return this.pyodide;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Internal method to load Pyodide
     * @private
     */
    async _loadPyodide() {
        try {
            console.log("Loading Pyodide runtime...");

            // Import loadPyodide from npm package
            const { loadPyodide } = await import("pyodide");

            // Initialize Pyodide with CDN files to avoid SRI integrity issues
            const pyodide = await loadPyodide({
                indexURL: "https://cdn.jsdelivr.net/pyodide/v0.28.0/full/"
            });

            // Pre-load common Python packages
            console.log("Loading Python packages: numpy, pandas, requests...");
            await pyodide.loadPackage(["numpy", "pandas", "requests"]);

            console.log("Pyodide loaded successfully with packages!");
            return pyodide;
        } catch (error) {
            console.error("Failed to load Pyodide:", error);
            throw new Error(
                `Failed to initialize Python runtime: ${error.message}`
            );
        }
    }

    /**
     * Execute Python code safely using Pyodide
     * @param {string} code - Python code to execute
     * @returns {Promise<any>} Raw execution result
     * @throws {Error} If execution fails
     */
    async execute(code) {
        if (!code || typeof code !== "string") {
            throw new Error("Invalid code: expected non-empty string");
        }

        try {
            // Ensure Pyodide is loaded
            const pyodide = await this.initializePyodide();

            // Capture print() output so it can be shown with the result
            const output = [];
            const capture = { batched: (line) => output.push(line) };
            pyodide.setStdout(capture);
            pyodide.setStderr(capture);

            // Execute the Python code (async so top-level await works)
            let result = await pyodide.runPythonAsync(code);

            if (result && typeof result.toJs === "function") {
                result = convertProxy(result);
            }

            if (output.length > 0) {
                return new OutputResult(output.join("\n"), result);
            }

            return result;
        } catch (error) {
            // Handle Pyodide-specific errors
            if (error.name === "PythonError") {
                throw new Error(`Python execution failed: ${error.message}`);
            }

            // Re-throw with more context
            throw new Error(`Python execution failed: ${error.message}`);
        }
    }

    /**
     * Get display name for this executor
     * @returns {string} Display name
     */
    getDisplayName() {
        return "Python";
    }

    /**
     * Check if Pyodide is loaded and ready
     * @returns {boolean} True if ready to execute
     */
    isReady() {
        return this.pyodide !== null && !this.isLoading;
    }
}

// Export convenience instance
export const pythonExecutor = new PythonExecutor();
