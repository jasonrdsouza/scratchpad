/**
 * Python Executor - Handles Python code execution using Pyodide WebAssembly
 *
 * Implements the Executor interface for Python code execution using Pyodide.
 * Provides safe execution with proper error handling and result processing.
 */

import { Executor, OutputResult } from "./executor.js";

/**
 * Python helper that turns numpy arrays and scalars into plain Python lists
 * and numbers, which convert to JavaScript arrays and numbers rather than
 * typed arrays (and work for dtypes like strings that have no typed array)
 */
const PREPARE_RESULT_PY = `
def _scratchpad_prepare_result(value):
    if type(value).__module__ == "numpy" and hasattr(value, "tolist"):
        return value.tolist()
    return value

_scratchpad_prepare_result
`;

/**
 * Convert a Python object proxy to a plain JavaScript value and release it.
 * Dicts become plain objects (not Maps); objects with no JavaScript
 * equivalent (e.g. a pandas DataFrame) fall back to their Python str().
 * @param {Object} proxy - PyProxy returned by Pyodide
 * @returns {any} JavaScript value
 */
function convertProxy(proxy) {
    if (typeof proxy.toJs !== "function") {
        return proxy;
    }

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
    /**
     * @param {Object} options
     * @param {string} options.indexURL - Where to load the Pyodide runtime from
     *   (defaults to the CDN, matching the installed package version)
     * @param {string[]} options.preloadPackages - Packages to load up front
     */
    constructor({
        indexURL = null,
        preloadPackages = ["numpy", "pandas", "requests"]
    } = {}) {
        super("Python");
        this.indexURL = indexURL;
        this.preloadPackages = preloadPackages;
        this.loadPromise = null;
    }

    /**
     * Initialize Pyodide runtime (lazy loading, shared across calls)
     * @returns {Promise<Object>} Pyodide instance
     */
    initializePyodide() {
        if (!this.loadPromise) {
            this.loadPromise = this._loadPyodide().catch((error) => {
                // Allow a retry on the next execution
                this.loadPromise = null;
                throw error;
            });
        }
        return this.loadPromise;
    }

    /**
     * Internal method to load Pyodide
     * @private
     */
    async _loadPyodide() {
        try {
            console.log("Loading Pyodide runtime...");

            // Import loadPyodide from npm package
            const { loadPyodide, version } = await import("pyodide");

            // Load the runtime files from the CDN, matching the installed
            // package version (loadPyodide rejects mismatched versions).
            // The service worker caches them for offline use.
            const pyodide = await loadPyodide({
                indexURL:
                    this.indexURL ??
                    `https://cdn.jsdelivr.net/pyodide/v${version}/full/`
            });

            // Pre-load common Python packages (so they're cached for offline use)
            if (this.preloadPackages.length > 0) {
                await pyodide.loadPackage(this.preloadPackages);
            }

            this.prepareResult = pyodide.runPython(PREPARE_RESULT_PY);

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

            // Load any other Pyodide-bundled packages the code imports
            // (logging progress to the console rather than the result)
            await pyodide.loadPackagesFromImports(code, {
                messageCallback: (message) => console.log(message),
                errorCallback: (message) => console.warn(message)
            });

            // Capture print() output so it can be shown with the result
            const output = [];
            const capture = { batched: (line) => output.push(line) };
            pyodide.setStdout(capture);
            pyodide.setStderr(capture);

            // Execute the Python code (async so top-level await works)
            let result = await pyodide.runPythonAsync(code);

            if (result && typeof result.toJs === "function") {
                // The helper returns a new proxy or a plain JavaScript value
                const prepared = this.prepareResult(result);
                result.destroy();
                result = convertProxy(prepared);
            }

            if (output.length > 0) {
                return new OutputResult(output.join("\n"), result);
            }

            return result;
        } catch (error) {
            throw new Error(`Python execution failed: ${error.message}`);
        }
    }
}
