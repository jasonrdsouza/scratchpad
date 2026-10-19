import { Vim } from "@replit/codemirror-vim";
import { saveContent } from "./state-manager.js";
import {
    switchTheme,
    getAvailableThemes,
    getCurrentTheme
} from "./theme-manager.js";
import { executionEngine } from "./execution/engine.js";
import { formatForConsole } from "./execution/formatters.js";
import { formatText } from "./formatting.js";
import { getMainHelp, getTopicHelp, getAvailableTopics } from "./help.js";
import { highlightWhitespace, lineNumbers } from "@codemirror/view";
import { lineNumbersRelative } from "@uiw/codemirror-extensions-line-numbers-relative";
import { EditorView } from "codemirror";
import {
    STORAGE_KEYS,
    TIMING,
    REGISTERS,
    VIM_ABBREVIATIONS,
    HELP,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES
} from "./config.js";

/**
 * Get the text held in a vim register, or null if it's empty
 * @param {string} registerName - Register name (" for the unnamed register)
 */
function getRegisterText(registerName) {
    const registerController = Vim.getVimGlobalState_().registerController;
    const register =
        registerName === REGISTERS.UNNAMED
            ? registerController.unnamedRegister
            : registerController.registers[registerName];
    const text = register?.keyBuffer?.[0];
    return text && text.trim() ? text : null;
}

/**
 * Check whether an execution command argument names a register to run.
 * Only letter registers (and ") count, and only when they hold text, so that
 * inline code like `:js 5` or `:js x` is evaluated rather than looked up.
 */
function isRegisterArgument(arg) {
    return (
        arg.length === 1 &&
        REGISTERS.EXECUTABLE_PATTERN.test(arg) &&
        getRegisterText(arg) !== null
    );
}

/**
 * Get the document range an ex command applies to: its line range if one was
 * given (e.g. :'<,'>cmd or :10,20cmd), otherwise the selection or current line.
 * Vim passes range lines 0-based.
 */
function getCommandRange(state, params) {
    if (params.line !== undefined) {
        const lastLine = state.doc.lines - 1;
        const start = Math.max(0, Math.min(params.line, lastLine));
        const end = Math.max(
            start,
            Math.min(params.lineEnd ?? params.line, lastLine)
        );
        return {
            from: state.doc.line(start + 1).from,
            to: state.doc.line(end + 1).to
        };
    }

    const selection = state.selection.main;
    if (!selection.empty) {
        return { from: selection.from, to: selection.to };
    }

    const line = state.doc.lineAt(selection.head);
    return { from: line.from, to: line.to };
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

// Result popup element and its timers, shared across calls
let resultDisplay = null;
let hideTimer = null;
let removeTimer = null;

function startHideTimer() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideResult, TIMING.RESULT_DISPLAY_TIMEOUT_MS);
}

function hideResult() {
    resultDisplay.classList.remove("show");
    removeTimer = setTimeout(
        () => resultDisplay.remove(),
        TIMING.RESULT_HIDE_ANIMATION_MS
    );
}

/**
 * Show execution results with styled popup
 */
function showExecutionResult(result, isError = false) {
    if (!resultDisplay) {
        resultDisplay = document.createElement("div");
        resultDisplay.id = "js-result-display";

        // Pause auto-hide while hovering
        resultDisplay.addEventListener("mouseenter", () =>
            clearTimeout(hideTimer)
        );
        resultDisplay.addEventListener("mouseleave", startHideTimer);
    }

    // Cancel any pending hide/remove from a previous result
    clearTimeout(removeTimer);
    if (!resultDisplay.isConnected) {
        document.body.appendChild(resultDisplay);
    }

    resultDisplay.textContent = result;
    resultDisplay.className = isError ? "error" : "success";

    // Force a reflow so the fade-in transition runs when re-attached
    void resultDisplay.offsetWidth;
    resultDisplay.classList.add("show");

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
        localStorage.setItem(STORAGE_KEYS.FILETYPE, lang);
    } else {
        view.dispatch({
            effects: languageCompartment.reconfigure([])
        });
        localStorage.removeItem(STORAGE_KEYS.FILETYPE);
    }
}

/**
 * Register all vim commands
 */
export function registerVimCommands(
    editorView,
    languages,
    languageCompartment,
    themeCompartment,
    whitespaceCompartment,
    wrapCompartment,
    lineNumberCompartment
) {
    // Make editorView globally accessible (e.g. from :js)
    window.editorView = editorView;

    // Switch between relative and absolute line numbers
    const setRelativeNumbers = (relative) => {
        editorView.dispatch({
            effects: lineNumberCompartment.reconfigure(
                relative ? lineNumbersRelative : lineNumbers()
            )
        });
        localStorage.setItem(STORAGE_KEYS.RELATIVE_NUMBERS, String(relative));
        showExecutionResult(
            relative
                ? SUCCESS_MESSAGES.RELATIVE_NUMBERS_ENABLED
                : SUCCESS_MESSAGES.ABSOLUTE_NUMBERS_ENABLED,
            false
        );
    };

    // File operations
    Vim.defineEx("w", "w", () => saveContent(editorView));
    Vim.defineEx("q", "q", () => window.close());
    Vim.defineEx("wq", "wq", () => {
        saveContent(editorView);
        window.close();
    });

    // Settings command
    Vim.defineEx("set", "set", (cm, params) => {
        if (params.args && params.args.length > 0) {
            const arg = params.args[0];

            // Handle relativenumber options (with proper vim abbreviations + common shortcuts)
            if (VIM_ABBREVIATIONS.RELATIVE_NUMBER.ENABLE.includes(arg)) {
                setRelativeNumbers(true);
            } else if (
                VIM_ABBREVIATIONS.RELATIVE_NUMBER.DISABLE.includes(arg)
            ) {
                setRelativeNumbers(false);
            } else if (arg === "wrap") {
                editorView.dispatch({
                    effects: wrapCompartment.reconfigure([
                        EditorView.lineWrapping
                    ])
                });
                localStorage.setItem(STORAGE_KEYS.WRAP, "true");
            } else if (arg === "nowrap") {
                editorView.dispatch({
                    effects: wrapCompartment.reconfigure([])
                });
                localStorage.setItem(STORAGE_KEYS.WRAP, "false");
            } else {
                // Handle key=value pairs (like filetype)
                const [key, value] = arg.split("=");
                if (VIM_ABBREVIATIONS.FILETYPE.includes(key)) {
                    setLanguage(
                        editorView,
                        value,
                        languages,
                        languageCompartment
                    );
                }
            }
        }
    });

    // Shared code execution command handler:
    //   :js <code>      - run inline code
    //   :js a           - run register a (letters or ", if non-empty)
    //   :'<,'>js        - run a line range (e.g. a visual selection)
    //   :js             - run the current line
    const handleExecutionCommand = async (cm, params, language) => {
        try {
            // Use the raw argument string so inline code keeps its whitespace
            const argString = (params.argString || "").trim();
            let code;

            if (argString && isRegisterArgument(argString)) {
                code = getRegisterText(argString);
            } else if (argString) {
                code = argString;
            } else {
                const { from, to } = getCommandRange(editorView.state, params);
                code = editorView.state.doc.sliceString(from, to);
            }

            if (!code.trim()) {
                throw new Error(ERROR_MESSAGES.NO_CODE_FOUND);
            }

            await executeCode(code.trim(), language);
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
            const registerController =
                Vim.getVimGlobalState_().registerController;

            // Check if a specific register was requested
            const registerName =
                params.args && params.args.length > 0 ? params.args[0] : null;

            if (registerName) {
                // Show specific register
                const content = getRegisterText(registerName);

                if (content !== null) {
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

                const unnamedText = getRegisterText(REGISTERS.UNNAMED);
                if (unnamedText !== null) {
                    registerData['"" (unnamed)'] = unnamedText;
                }

                for (const regName of Object.keys(
                    registerController.registers
                )) {
                    const text = getRegisterText(regName);
                    if (text !== null) {
                        registerData[`"${regName}"`] = text;
                    }
                }

                const registerCount = Object.keys(registerData).length;

                // Display formatted output
                console.log("=== VIM REGISTERS ===");
                if (registerCount > 0) {
                    console.table(registerData);

                    // Create a more readable summary for the popup
                    const maxLength = HELP.MAX_REGISTER_DISPLAY_LENGTH;
                    const summary = Object.entries(registerData)
                        .map(([reg, content]) => {
                            // Truncate long content for display
                            const truncatedContent =
                                content.length > maxLength
                                    ? content.substring(0, maxLength - 3) +
                                      "..."
                                    : content;
                            // Replace newlines for better display
                            const displayContent = truncatedContent.replace(
                                /\n/g,
                                HELP.REGISTER_NEWLINE_REPLACEMENT
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
                const themeName = switchTheme(
                    editorView,
                    params.args[0],
                    themeCompartment
                );
                showExecutionResult(
                    SUCCESS_MESSAGES.THEME_SWITCHED(themeName),
                    false
                );
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
            // Format the command's range (e.g. :'<,'>fmt or :10,20fmt),
            // otherwise the selection or current line
            const state = editorView.state;
            const replaceRange = getCommandRange(state, params);
            const textToFormat = state.doc.sliceString(
                replaceRange.from,
                replaceRange.to
            );

            // Determine format type (default to auto-detect)
            const formatType =
                params.args && params.args.length > 0
                    ? params.args[0].toLowerCase()
                    : "auto";

            // Format the text using the formatting module
            const result = formatText(textToFormat, formatType);

            // Replace the text in the editor
            editorView.dispatch({
                changes: {
                    from: replaceRange.from,
                    to: replaceRange.to,
                    insert: result.text
                }
            });

            // Show success message with detected format type
            showExecutionResult(
                SUCCESS_MESSAGES.FORMAT_SUCCESS(result.format),
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
                const topic = params.args[0].toLowerCase();
                const availableTopics = getAvailableTopics();

                // Check for any help topic (languages and commands unified)
                if (availableTopics.includes(topic)) {
                    const helpText = getTopicHelp(topic);
                    console.log(`Help for ${topic}:`);
                    console.log(helpText);
                    showExecutionResult(helpText, false);
                }
                // Unknown topic
                else {
                    showExecutionResult(
                        `Unknown topic: ${topic}. Available: ${availableTopics.join(", ")}`,
                        true
                    );
                }
            } else {
                // Show main help
                const supportedLanguages =
                    executionEngine.getSupportedLanguages();
                const helpSummary = getMainHelp(supportedLanguages);

                console.log(helpSummary);
                showExecutionResult(helpSummary, false);
            }
        } catch (error) {
            console.error("Help error:", error);
            showExecutionResult("Error displaying help", true);
        }
    });

    // Whitespace visibility toggle
    let whitespaceVisible = false;
    Vim.defineEx("whitespace", "whitespace", (cm, params) => {
        try {
            if (params.args && params.args.length > 0) {
                const action = params.args[0].toLowerCase();
                if (action === "on" || action === "show") {
                    whitespaceVisible = true;
                } else if (action === "off" || action === "hide") {
                    whitespaceVisible = false;
                } else if (action === "toggle") {
                    whitespaceVisible = !whitespaceVisible;
                } else {
                    throw new Error(
                        ERROR_MESSAGES.UNKNOWN_WHITESPACE_ACTION(action)
                    );
                }
            } else {
                // No args - toggle by default
                whitespaceVisible = !whitespaceVisible;
            }

            // Update the editor
            editorView.dispatch({
                effects: whitespaceCompartment.reconfigure(
                    whitespaceVisible ? [highlightWhitespace()] : []
                )
            });

            const message = whitespaceVisible
                ? SUCCESS_MESSAGES.WHITESPACE_VISIBLE
                : SUCCESS_MESSAGES.WHITESPACE_HIDDEN;
            console.log(message);
            showExecutionResult(message, false);
        } catch (error) {
            console.error("Whitespace toggle error:", error);
            showExecutionResult(error.message, true);
        }
    });

    // Theme switching commands (vim standard + alternative)
    Vim.defineEx("colorscheme", "colo", switchThemeCommand);
    Vim.defineEx("theme", "theme", switchThemeCommand);

    // Line number commands (relative/absolute) with proper vim abbreviations
    Vim.defineEx("relativenumber", "rela", () => setRelativeNumbers(true));
    Vim.defineEx("norelativenumber", "norela", () => setRelativeNumbers(false));
}
