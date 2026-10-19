/**
 * Register Management - Store execution results in vim registers
 *
 * Uses the proper vim register API so results can be pasted with "rp.
 */

import { Vim } from "@replit/codemirror-vim";
import { REGISTERS } from "../config.js";

/**
 * Store execution result in the results register
 * @param {string} resultString - Formatted result string to store
 * @param {string} registerName - Optional register name, defaults to results register
 */
export function storeResult(resultString, registerName = REGISTERS.RESULT) {
    try {
        const registerController = Vim.getVimGlobalState_().registerController;
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
    } catch (error) {
        console.error(
            `Failed to store result in register "${registerName}":`,
            error
        );
        throw error;
    }
}
