import { Vim } from "@replit/codemirror-vim";
import { saveContent } from "./state-manager.js";
import {
    switchTheme,
    getAvailableThemes,
    getCurrentTheme,
    getTheme
} from "./theme-manager.js";

/**
 * Get code from vim registers (unnamed or named)
 */
function getCodeFromRegister(registerName = null) {
    // First try to get yanked text from vim registers
    try {
        const vimGlobalState = Vim.getVimGlobalState_();
        const registerController = vimGlobalState.registerController;

        if (registerName) {
            // Get text from named register
            const namedRegister = registerController.registers[registerName];
            if (
                namedRegister &&
                namedRegister.keyBuffer &&
                namedRegister.keyBuffer.length > 0
            ) {
                const registerText = namedRegister.keyBuffer[0];
                if (registerText && registerText.trim()) {
                    return registerText;
                }
            }
            throw new Error(`Register '${registerName}' is empty or not found`);
        } else {
            // Use unnamed register
            const unnamedReg = registerController.unnamedRegister;
            if (
                unnamedReg &&
                unnamedReg.keyBuffer &&
                unnamedReg.keyBuffer.length > 0
            ) {
                const yankedText = unnamedReg.keyBuffer[0];
                if (yankedText && yankedText.trim()) {
                    return yankedText;
                }
            }
        }
    } catch (error) {
        if (registerName) {
            throw error; // Re-throw named register errors
        }
        // Continue to fallbacks for unnamed register
    }

    // Fall back to CodeMirror selection or current line
    const state = window.editorView.state;
    const selection = state.selection.main;

    if (!selection.empty) {
        return state.doc.sliceString(selection.from, selection.to);
    } else {
        // Return current line
        const line = state.doc.lineAt(selection.head);
        return line.text;
    }
}

/**
 * Execute JavaScript code safely and display results
 */
function executeJavaScript(code) {
    try {
        // Create a safe execution context
        const result = eval(code);

        // Handle different result types
        let displayResult;
        if (result === undefined) {
            displayResult = "undefined";
        } else if (result === null) {
            displayResult = "null";
        } else if (typeof result === "function") {
            displayResult = result.toString();
        } else if (typeof result === "object") {
            displayResult = JSON.stringify(result, null, 2);
        } else {
            displayResult = String(result);
        }

        // Show result in console and as a temporary indicator
        console.log("JavaScript result:", result);
        showExecutionResult(displayResult, false);

        return result;
    } catch (error) {
        console.error("JavaScript execution error:", error);
        showExecutionResult(`Error: ${error.message}`, true);
        return null;
    }
}

/**
 * Show execution results with styled popup
 */
function showExecutionResult(result, isError = false) {
    // Create or update result display
    let resultDisplay = document.getElementById("js-result-display");

    if (!resultDisplay) {
        resultDisplay = document.createElement("div");
        resultDisplay.id = "js-result-display";
        document.body.appendChild(resultDisplay);
    }

    // Reset classes and set content
    resultDisplay.className = "";
    resultDisplay.textContent = result;

    // Apply appropriate styling class
    if (isError) {
        resultDisplay.classList.add("error");
    } else {
        resultDisplay.classList.add("success");
    }

    // Show the result
    resultDisplay.classList.add("show");

    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (resultDisplay) {
            resultDisplay.classList.remove("show");
            setTimeout(() => {
                if (resultDisplay && resultDisplay.parentNode) {
                    resultDisplay.parentNode.removeChild(resultDisplay);
                }
            }, 300);
        }
    }, 5000);
}

/**
 * Set language for the editor
 */
function setLanguage(view, lang, languages, languageCompartment) {
    const language = languages[lang];
    if (language) {
        view.dispatch({
            effects: languageCompartment.reconfigure(language())
        });
        localStorage.setItem("vim-scratchpad-filetype", lang);
    } else {
        view.dispatch({
            effects: languageCompartment.reconfigure([])
        });
        localStorage.removeItem("vim-scratchpad-filetype");
    }
}

/**
 * Register all vim commands
 */
export function registerVimCommands(
    editorView,
    languages,
    languageCompartment,
    themeCompartment
) {
    // Make editorView globally accessible for commands
    window.editorView = editorView;

    // File operations
    Vim.defineEx("w", "w", () => saveContent(editorView));
    Vim.defineEx("q", "q", () => window.close());
    Vim.defineEx("wq", "wq", () => {
        saveContent(editorView);
        window.close();
    });

    // Language/filetype setting
    Vim.defineEx("set", "set", (cm, params) => {
        if (params.args && params.args.length > 0) {
            const [key, value] = params.args[0].split("=");
            if (key === "filetype" || key === "ft") {
                setLanguage(editorView, value, languages, languageCompartment);
            }
        }
    });

    // JavaScript execution commands
    Vim.defineEx("js", "js", (cm, params) => {
        try {
            // Check if a register name was provided
            const registerName =
                params.args && params.args.length > 0 ? params.args[0] : null;
            const code = getCodeFromRegister(registerName);

            if (code.trim()) {
                executeJavaScript(code);
            } else {
                showExecutionResult("No code found", true);
            }
        } catch (error) {
            showExecutionResult(error.message, true);
        }
    });

    Vim.defineEx("eval", "eval", (cm, params) => {
        try {
            // Check if a register name was provided
            const registerName =
                params.args && params.args.length > 0 ? params.args[0] : null;
            const code = getCodeFromRegister(registerName);

            if (code.trim()) {
                executeJavaScript(code);
            } else {
                showExecutionResult("No code found", true);
            }
        } catch (error) {
            showExecutionResult(error.message, true);
        }
    });

    // Register inspection command
    Vim.defineEx("registers", "registers", (cm, params) => {
        try {
            const vimGlobalState = Vim.getVimGlobalState_();
            const registerController = vimGlobalState.registerController;

            // Check if a specific register was requested
            const registerName =
                params.args && params.args.length > 0 ? params.args[0] : null;

            if (registerName) {
                // Show specific register
                const register =
                    registerController.registers[registerName] ||
                    (registerName === '"'
                        ? registerController.unnamedRegister
                        : null);

                if (
                    register &&
                    register.keyBuffer &&
                    register.keyBuffer.length > 0
                ) {
                    const content = register.keyBuffer[0];
                    console.log(
                        `Register '${registerName}':`,
                        JSON.stringify(content)
                    );
                    showExecutionResult(
                        `Register '${registerName}': ${content}`,
                        false
                    );
                } else {
                    console.log(`Register '${registerName}' is empty`);
                    showExecutionResult(
                        `Register '${registerName}' is empty`,
                        true
                    );
                }
            } else {
                // Show all registers with content
                console.log("=== VIM REGISTERS ===");

                // Show unnamed register
                const unnamedReg = registerController.unnamedRegister;
                if (
                    unnamedReg &&
                    unnamedReg.keyBuffer &&
                    unnamedReg.keyBuffer.length > 0
                ) {
                    console.log(
                        `"" (unnamed):`,
                        JSON.stringify(unnamedReg.keyBuffer[0])
                    );
                }

                // Show named registers
                const registers = registerController.registers;
                for (const [regName, register] of Object.entries(registers)) {
                    if (
                        register &&
                        register.keyBuffer &&
                        register.keyBuffer.length > 0
                    ) {
                        console.log(
                            `"${regName}":`,
                            JSON.stringify(register.keyBuffer[0])
                        );
                    }
                }

                showExecutionResult(
                    "Register contents printed to console",
                    false
                );
            }
        } catch (error) {
            console.error("Error accessing registers:", error);
            showExecutionResult("Error accessing registers", true);
        }
    });

    // Theme switching function (shared logic)
    const switchThemeCommand = (cm, params) => {
        try {
            if (params.args && params.args.length > 0) {
                const themeName = params.args[0];

                // Use theme compartment for clean theme switching
                if (!getAvailableThemes().includes(themeName)) {
                    throw new Error(
                        `Unknown theme: ${themeName}. Available themes: ${getAvailableThemes().join(", ")}`
                    );
                }

                // Get the new theme and reconfigure
                const newTheme = getTheme(themeName);
                editorView.dispatch({
                    effects: themeCompartment.reconfigure(newTheme)
                });

                // Save theme preference
                localStorage.setItem("vim-scratchpad-theme", themeName);

                console.log(`Switched to theme: ${themeName}`);
                showExecutionResult(`Switched to theme: ${themeName}`, false);
            } else {
                // Show current theme and available themes
                const current = getCurrentTheme();
                const available = getAvailableThemes();
                console.log(`Current theme: ${current}`);
                console.log(`Available themes: ${available.join(", ")}`);
                showExecutionResult(
                    `Current: ${current}. Available: ${available.join(", ")}`,
                    false
                );
            }
        } catch (error) {
            console.error("Theme error:", error);
            showExecutionResult(error.message, true);
        }
    };

    // Theme switching commands (vim standard + alternative)
    Vim.defineEx("colorscheme", "colo", switchThemeCommand);
    Vim.defineEx("theme", "theme", switchThemeCommand);
}
