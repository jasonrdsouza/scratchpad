/**
 * Python Executor - Handles Python code execution using Pyodide WebAssembly
 *
 * Implements the Executor interface for Python code execution using Pyodide.
 * Provides safe execution with proper error handling and result processing.
 */

import { Executor } from "./executor.js";
import { getResultsRegister } from "./registers.js";

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

            // Execute the Python code
            const result = pyodide.runPython(code);

            // Convert Python objects to JavaScript objects when possible
            if (result && typeof result.toJs === "function") {
                return result.toJs();
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
     * Check if this executor can handle the given code
     * Basic Python syntax detection
     * @param {string} code - Code to check
     * @returns {boolean} True if looks like Python
     */
    canExecute(code) {
        if (!code || typeof code !== "string") {
            return false;
        }

        // Python syntax indicators
        const pythonPatterns = [
            /^\s*import\s+\w+/, // import statements
            /^\s*from\s+\w+\s+import/, // from import statements
            /^\s*def\s+\w+\s*\(/, // function definitions
            /^\s*class\s+\w+/, // class definitions
            /^\s*if\s+.*:/, // if statements
            /^\s*for\s+.*:/, // for loops
            /^\s*while\s+.*:/, // while loops
            /^\s*try\s*:/, // try blocks
            /print\s*\(/, // print function calls
            /^\s*#/, // comments
            /:\s*$/, // lines ending with colon (Python blocks)
            /^\s{4}/ // 4-space indentation (common Python style)
        ];

        // If any Python pattern matches, we can probably execute it
        return pythonPatterns.some((pattern) => pattern.test(code));
    }

    /**
     * Get help text for this executor
     * @returns {string} Help text
     */
    getHelpText() {
        return `
Python Execution Help:
• Execute any valid Python expression or statement
• Supports Python 3.13.2 via Pyodide WebAssembly runtime
• Pre-loaded packages: numpy, pandas, requests
• Results are automatically stored in "${getResultsRegister()}" register
• First execution may take a moment to load the Python runtime

Examples:
  :py print("Hello, World!")
  :py [x**2 for x in range(5)]
  :py import math; math.pi * 2
  :python sum([1, 2, 3, 4, 5])
  :py import numpy as np; np.array([1,2,3])
  :py import pandas as pd; pd.DataFrame({"a": [1,2,3]})
  :py import requests; requests.get("https://httpbin.org/json").json()

Note: Additional packages can be installed using micropip:
  :py import micropip; await micropip.install("matplotlib")
        `.trim();
    }

    /**
     * Check if Pyodide is loaded and ready
     * @returns {boolean} True if ready to execute
     */
    isReady() {
        return this.pyodide !== null && !this.isLoading;
    }

    /**
     * Get loading status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            isReady: this.isReady(),
            isLoading: this.isLoading,
            hasRuntime: this.pyodide !== null
        };
    }
}

// Export convenience instance
export const pythonExecutor = new PythonExecutor();
