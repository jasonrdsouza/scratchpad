/**
 * Register Management - Handle storage and retrieval of execution results
 *
 * Provides a clean interface for storing execution results in vim registers
 * using the proper vim API for reliable pasting functionality.
 */

import { Vim } from "@replit/codemirror-vim";

/**
 * Default register for storing execution results
 */
const RESULTS_REGISTER = "r";

/**
 * Store execution result in the results register
 * @param {string} resultString - Formatted result string to store
 * @param {string} registerName - Optional register name, defaults to results register
 */
export async function storeResult(
    resultString,
    registerName = RESULTS_REGISTER
) {
    try {
        const vimGlobalState = Vim.getVimGlobalState_();
        const registerController = vimGlobalState.registerController;

        // Use vim's proper register API for reliable pasting
        if (registerController.pushText) {
            // Use vim's built-in register API - this works properly with pasting
            registerController.pushText(
                registerName,
                "char",
                resultString,
                false,
                false
            );
            console.log(
                `Stored result in register ("${registerName}): ${resultString}`
            );
        } else {
            // Fallback to manual register manipulation with proper structure
            if (!registerController.registers[registerName]) {
                registerController.registers[registerName] = {
                    keyBuffer: [],
                    linewise: false
                };
            }
            registerController.registers[registerName].keyBuffer = [
                resultString
            ];
            registerController.registers[registerName].linewise = false;
            console.log(
                `Stored result in register ("${registerName}): ${resultString}`
            );
        }
    } catch (error) {
        console.error(
            `Failed to store result in register "${registerName}":`,
            error
        );
        throw error;
    }
}

/**
 * Get the current results register name
 * @returns {string} The register name used for storing results
 */
export function getResultsRegister() {
    return RESULTS_REGISTER;
}

/**
 * Get formatted help text about the results register
 * @returns {string} Help text explaining how to use results
 */
export function getResultsHelpText() {
    return `Results stored in "${RESULTS_REGISTER}" register. Use "${RESULTS_REGISTER}p" to paste, ":registers ${RESULTS_REGISTER}" to view.`;
}

/**
 * Clear the results register
 */
export async function clearResults() {
    try {
        const vimGlobalState = Vim.getVimGlobalState_();
        const registerController = vimGlobalState.registerController;

        if (registerController.registers[RESULTS_REGISTER]) {
            registerController.registers[RESULTS_REGISTER].keyBuffer = [];
        }

        console.log(`Cleared results register ("${RESULTS_REGISTER})`);
    } catch (error) {
        console.error("Failed to clear results register:", error);
        throw error;
    }
}

/**
 * Check if results register has content
 * @returns {boolean} True if register contains results
 */
export function hasResults() {
    try {
        const vimGlobalState = Vim.getVimGlobalState_();
        const registerController = vimGlobalState.registerController;
        const register = registerController.registers[RESULTS_REGISTER];

        return (
            register &&
            register.keyBuffer &&
            register.keyBuffer.length > 0 &&
            register.keyBuffer[0] &&
            register.keyBuffer[0].trim().length > 0
        );
    } catch (error) {
        console.error("Failed to check results register:", error);
        return false;
    }
}

/**
 * Get the current result from the register (for internal use)
 * @returns {string|null} Current result string or null if empty
 */
export function getCurrentResult() {
    try {
        const vimGlobalState = Vim.getVimGlobalState_();
        const registerController = vimGlobalState.registerController;
        const register = registerController.registers[RESULTS_REGISTER];

        if (register && register.keyBuffer && register.keyBuffer.length > 0) {
            return register.keyBuffer[0];
        }

        return null;
    } catch (error) {
        console.error("Failed to get current result:", error);
        return null;
    }
}

/**
 * Register management utilities for debugging and introspection
 */
export const debug = {
    /**
     * Get all register names that contain data
     * @returns {string[]} Array of register names
     */
    getActiveRegisters() {
        try {
            const vimGlobalState = Vim.getVimGlobalState_();
            const registerController = vimGlobalState.registerController;
            const activeRegisters = [];

            // Check named registers
            if (registerController.registers) {
                for (const [name, register] of Object.entries(
                    registerController.registers
                )) {
                    if (
                        register &&
                        register.keyBuffer &&
                        register.keyBuffer.length > 0
                    ) {
                        activeRegisters.push(name);
                    }
                }
            }

            // Check unnamed register
            if (
                registerController.unnamedRegister &&
                registerController.unnamedRegister.keyBuffer &&
                registerController.unnamedRegister.keyBuffer.length > 0
            ) {
                activeRegisters.push('""');
            }

            return activeRegisters;
        } catch (error) {
            console.error("Failed to get active registers:", error);
            return [];
        }
    },

    /**
     * Get content of a specific register
     * @param {string} registerName - Register to inspect
     * @returns {string|null} Register content or null
     */
    getRegisterContent(registerName) {
        try {
            const vimGlobalState = Vim.getVimGlobalState_();
            const registerController = vimGlobalState.registerController;

            if (registerName === '""') {
                const reg = registerController.unnamedRegister;
                return (reg && reg.keyBuffer && reg.keyBuffer[0]) || null;
            }

            const register = registerController.registers[registerName];
            return (
                (register && register.keyBuffer && register.keyBuffer[0]) ||
                null
            );
        } catch (error) {
            console.error(
                `Failed to get register "${registerName}" content:`,
                error
            );
            return null;
        }
    }
};
