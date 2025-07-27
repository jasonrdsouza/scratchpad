import { Vim } from "@replit/codemirror-vim";
import { saveContent } from "./state-manager.js";
import {
    switchTheme,
    getAvailableThemes,
    getCurrentTheme,
    getTheme
} from "./theme-manager.js";
import { executionEngine } from "./execution/engine.js";
import { formatForConsole } from "./execution/formatters.js";
import { formatText } from "./formatting.js";

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
 * Execute code using the execution engine and display results
 */
async function executeCode(code, language = null) {
    const result = await executionEngine.execute(code, language);

    if (result.success) {
        // Show result in console and as a temporary indicator
        console.log(
            `${result.language} result:`,
            formatForConsole(result.rawResult)
        );
        showExecutionResult(result.formattedResult, false);
    } else {
        // Show error
        console.error(`${result.language} execution error:`, result.error);
        showExecutionResult(result.formattedResult, true);
    }

    return result;
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

    // Clear any existing timer
    if (resultDisplay.hideTimer) {
        clearTimeout(resultDisplay.hideTimer);
    }

    // Function to hide the result
    const hideResult = () => {
        if (resultDisplay) {
            resultDisplay.classList.remove("show");
            setTimeout(() => {
                if (resultDisplay && resultDisplay.parentNode) {
                    resultDisplay.parentNode.removeChild(resultDisplay);
                }
            }, 300);
        }
    };

    // Function to start the hide timer
    const startHideTimer = () => {
        resultDisplay.hideTimer = setTimeout(hideResult, 5000);
    };

    // Add hover event listeners to pause/resume auto-hide
    resultDisplay.addEventListener("mouseenter", () => {
        if (resultDisplay.hideTimer) {
            clearTimeout(resultDisplay.hideTimer);
        }
    });

    resultDisplay.addEventListener("mouseleave", () => {
        startHideTimer();
    });

    // Start the initial timer
    startHideTimer();
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

    // Shared code execution command handler
    const handleExecutionCommand = async (cm, params, language = null) => {
        try {
            if (params.args && params.args.length > 0) {
                // Check if first arg looks like a register name (single character)
                const firstArg = params.args[0];
                if (
                    firstArg.length === 1 &&
                    /^[a-zA-Z0-9"=_]$/.test(firstArg)
                ) {
                    // Treat as register name
                    const result = await executionEngine.executeFromRegister(
                        firstArg,
                        getCodeFromRegister,
                        language
                    );

                    if (result.success) {
                        console.log(
                            `${result.language} result:`,
                            formatForConsole(result.rawResult)
                        );
                        showExecutionResult(result.formattedResult, false);
                    } else {
                        showExecutionResult(result.formattedResult, true);
                    }
                } else {
                    // Treat as inline code - join all args
                    const code = params.args.join(" ");
                    await executeCode(code, language);
                }
            } else {
                // No args - get from unnamed register (yanked code)
                const result = await executionEngine.executeFromRegister(
                    null,
                    getCodeFromRegister,
                    language
                );

                if (result.success) {
                    console.log(
                        `${result.language} result:`,
                        formatForConsole(result.rawResult)
                    );
                    showExecutionResult(result.formattedResult, false);
                } else {
                    showExecutionResult(result.formattedResult, true);
                }
            }
        } catch (error) {
            showExecutionResult(error.message, true);
        }
    };

    // JavaScript execution commands
    Vim.defineEx("js", "js", (cm, params) =>
        handleExecutionCommand(cm, params, "javascript")
    );
    Vim.defineEx("eval", "eval", (cm, params) =>
        handleExecutionCommand(cm, params, "javascript")
    );

    // Python execution commands
    Vim.defineEx("py", "py", (cm, params) =>
        handleExecutionCommand(cm, params, "python")
    );
    Vim.defineEx("python", "python", (cm, params) =>
        handleExecutionCommand(cm, params, "python")
    );

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
                const registerData = {};
                let registerCount = 0;

                // Collect unnamed register
                const unnamedReg = registerController.unnamedRegister;
                if (
                    unnamedReg &&
                    unnamedReg.keyBuffer &&
                    unnamedReg.keyBuffer.length > 0
                ) {
                    registerData['"" (unnamed)'] = unnamedReg.keyBuffer[0];
                    registerCount++;
                }

                // Collect named registers
                const registers = registerController.registers;
                for (const [regName, register] of Object.entries(registers)) {
                    if (
                        register &&
                        register.keyBuffer &&
                        register.keyBuffer.length > 0
                    ) {
                        registerData[`"${regName}"`] = register.keyBuffer[0];
                        registerCount++;
                    }
                }

                // Display formatted output
                console.log("=== VIM REGISTERS ===");
                if (registerCount > 0) {
                    console.table(registerData);

                    // Create a more readable summary for the popup
                    const summary = Object.entries(registerData)
                        .map(([reg, content]) => {
                            // Truncate long content for display
                            const truncatedContent =
                                content.length > 50
                                    ? content.substring(0, 47) + "..."
                                    : content;
                            // Replace newlines with ↵ for better display
                            const displayContent = truncatedContent.replace(
                                /\n/g,
                                "↵"
                            );
                            return `${reg}: ${displayContent}`;
                        })
                        .join("\n");

                    showExecutionResult(
                        `Found ${registerCount} register(s):\n${summary}`,
                        false
                    );
                } else {
                    console.log("No registers contain data");
                    showExecutionResult("No registers contain data", true);
                }
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

    // Format command for JSON pretty-printing
    Vim.defineEx("fmt", "fmt", (cm, params) => {
        try {
            // Get the text to format
            const state = window.editorView.state;
            const selection = state.selection.main;

            let textToFormat;
            let replaceRange;

            // Check if we have a vim range (like :'<,'>fmt or :10,20fmt)
            if (params.line !== undefined && params.lineEnd !== undefined) {
                // Use vim range - convert from 1-based line numbers to 0-based positions
                const startLine = Math.max(0, params.line - 1);
                const endLine = Math.min(
                    state.doc.lines - 1,
                    params.lineEnd - 1
                );

                const fromPos = state.doc.line(startLine + 1).from;
                const toPos = state.doc.line(endLine + 1).to;

                textToFormat = state.doc.sliceString(fromPos, toPos);
                replaceRange = { from: fromPos, to: toPos };
            } else if (!selection.empty) {
                // Format visual selection
                textToFormat = state.doc.sliceString(
                    selection.from,
                    selection.to
                );
                replaceRange = { from: selection.from, to: selection.to };
            } else {
                // Format current line
                const line = state.doc.lineAt(selection.head);
                textToFormat = line.text;
                replaceRange = { from: line.from, to: line.to };
            }

            // Determine format type (default to auto-detect)
            const formatType =
                params.args && params.args.length > 0
                    ? params.args[0].toLowerCase()
                    : "auto";

            // Format the text using the formatting module
            const result = formatText(textToFormat, formatType);

            // Replace the text in the editor
            window.editorView.dispatch({
                changes: {
                    from: replaceRange.from,
                    to: replaceRange.to,
                    insert: result.text
                }
            });

            // Show success message with detected format type
            showExecutionResult(
                `Formatted as ${result.format.toUpperCase()}`,
                false
            );
        } catch (error) {
            console.error("Format error:", error);
            showExecutionResult(`Format error: ${error.message}`, true);
        }
    });

    // Help command
    Vim.defineEx("help", "help", (cm, params) => {
        try {
            if (params.args && params.args.length > 0) {
                const language = params.args[0].toLowerCase();
                const supportedLanguages =
                    executionEngine.getSupportedLanguages();

                if (supportedLanguages.includes(language)) {
                    // Get the executor for this language
                    const executor = executionEngine.executors.get(language);
                    if (
                        executor &&
                        typeof executor.getHelpText === "function"
                    ) {
                        const helpText = executor.getHelpText();
                        console.log(`Help for ${executor.getDisplayName()}:`);
                        console.log(helpText);
                        showExecutionResult(helpText, false);
                    } else {
                        showExecutionResult(
                            `No help available for ${language}`,
                            true
                        );
                    }
                } else {
                    showExecutionResult(
                        `Unknown language: ${language}. Available: ${supportedLanguages.join(", ")}`,
                        true
                    );
                }
            } else {
                // Show general help with all available executors
                const supportedLanguages =
                    executionEngine.getSupportedLanguages();
                const helpSummary = [
                    "=== SCRATCHPAD HELP ===",
                    "",
                    "File Operations:",
                    "  :w             - Save/write current content",
                    "  :q             - Quit/close window",
                    "  :wq            - Write and quit",
                    "",
                    "Code Execution:",
                    "  :js <code>     - Execute JavaScript",
                    "  :py <code>     - Execute Python",
                    "  :python <code> - Execute Python (alias)",
                    "  :eval <code>   - Execute JavaScript (alias)",
                    "",
                    "Code from Registers:",
                    "  :js a          - Execute JavaScript from register 'a'",
                    "  :py            - Execute Python from unnamed register (yanked code)",
                    "  Results stored in register 'r' - use \"rp to paste",
                    "",
                    "Text Formatting:",
                    "  :fmt           - Auto-format selection/line (detects JSON)",
                    "  :fmt json      - Format as JSON with sorted keys",
                    "  :fmt clean     - Remove trailing whitespace, normalize line endings",
                    "  :'<,'>fmt      - Format visual selection",
                    "  :10,20fmt      - Format specific line range",
                    "",
                    "Theme & Settings:",
                    "  :colorscheme   - Show current theme and available options",
                    "  :colo <theme>  - Change theme (short form)",
                    "  :theme <theme> - Change theme (alternative)",
                    "  :set ft=<lang> - Set file type for syntax highlighting",
                    "",
                    "Other Commands:",
                    "  :registers     - Show all vim registers",
                    "  :registers r   - Show results register",
                    "  :help <lang>   - Show help for specific language",
                    "",
                    `Available languages: ${supportedLanguages.join(", ")}`,
                    "",
                    "Examples:",
                    "  :help py       - Show Python help",
                    "  :help js       - Show JavaScript help"
                ].join("\n");

                console.log(helpSummary);
                showExecutionResult(helpSummary, false);
            }
        } catch (error) {
            console.error("Help error:", error);
            showExecutionResult("Error displaying help", true);
        }
    });

    // Theme switching commands (vim standard + alternative)
    Vim.defineEx("colorscheme", "colo", switchThemeCommand);
    Vim.defineEx("theme", "theme", switchThemeCommand);
}
