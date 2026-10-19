/**
 * Centralized Configuration
 *
 * Contains all constants, storage keys, defaults, and configuration values
 * used throughout the scratchpad application.
 */

/**
 * LocalStorage keys for data persistence
 */
export const STORAGE_KEYS = {
    CONTENT: "vim-scratchpad-content",
    FILETYPE: "vim-scratchpad-filetype",
    THEME: "vim-scratchpad-theme",
    WRAP: "vim-scratchpad-wrap",
    RELATIVE_NUMBERS: "vim-scratchpad-relativenumber",
    VIM_COMMAND_HISTORY: "vim-command-history",
    VIM_SEARCH_HISTORY: "vim-search-history",
    EDITOR_STATE: "editor-state"
};

/**
 * Application defaults
 */
export const DEFAULTS = {
    THEME: "nord",
    CONTENT: "Welcome to your Vim Scratchpad!\n\n:set filetype=markdown",
    WRAP: false,
    RELATIVE_NUMBERS: false,
    EXECUTION_LANGUAGE: "javascript"
};

/**
 * Timing and performance settings
 */
export const TIMING = {
    AUTOSAVE_INTERVAL_MS: 5000,
    VIM_INIT_DELAY_MS: 100,
    RESULT_DISPLAY_TIMEOUT_MS: 5000,
    RESULT_HIDE_ANIMATION_MS: 300
};

/**
 * Theme categories and names
 */
export const THEMES = {
    LIGHT: [
        "solarized-light",
        "github-light",
        "material-light",
        "gruvbox-light",
        "tokyo-night-day",
        "basic-light"
    ],
    DARK: [
        "nord",
        "solarized-dark",
        "github-dark",
        "material-dark",
        "gruvbox-dark",
        "tokyo-night",
        "tokyo-night-storm",
        "basic-dark"
    ]
};

/**
 * All available theme names (computed)
 */
export const ALL_THEMES = [...THEMES.LIGHT, ...THEMES.DARK].sort();

/**
 * Register names and patterns
 */
export const REGISTERS = {
    UNNAMED: '"',
    RESULT: "r",
    // Registers that :js/:py accept as a source of code to run
    EXECUTABLE_PATTERN: /^[a-zA-Z"]$/
};

/**
 * Vim command abbreviations
 */
export const VIM_ABBREVIATIONS = {
    RELATIVE_NUMBER: {
        ENABLE: ["relativenumber", "relati", "rela", "rnu"],
        DISABLE: ["norelativenumber", "norelati", "norela", "nornu"]
    },
    FILETYPE: ["filetype", "ft"]
};

/**
 * File format detection patterns
 */
export const FORMAT_PATTERNS = {
    JSON: {
        START_PATTERNS: ["{", "["],
        END_PATTERNS: ["}", "]"]
    },
    CSV_DELIMITERS: [",", "\t", "|", ";"],
    MULTI_SPACE_REGEX: /\s{2,}/
};

/**
 * Help system configuration
 */
export const HELP = {
    MAX_REGISTER_DISPLAY_LENGTH: 50,
    REGISTER_NEWLINE_REPLACEMENT: "↵",
    MIN_TABLE_COLUMN_WIDTH: 3
};

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
    UNKNOWN_THEME: (theme, available) =>
        `Unknown theme: ${theme}. Available themes: ${available.join(", ")}`,
    NO_CODE_FOUND: "No code found",
    INVALID_JSON: (error) => `Invalid JSON: ${error}`,
    UNSUPPORTED_FORMAT: (format) =>
        `Unsupported format type: ${format}. Currently supported: 'json', 'clean', 'table'.`,
    UNSUPPORTED_LANGUAGE: (language) => `Unsupported language: ${language}`,
    UNKNOWN_WHITESPACE_ACTION: (action) =>
        `Unknown whitespace action: ${action}. Use 'on', 'off', or 'toggle'.`,
    NO_TEXT_TO_FORMAT: "No text to format",
    NO_DATA_TO_FORMAT: "No data to format as table"
};

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
    THEME_SWITCHED: (theme) => `Switched to theme: ${theme}`,
    RELATIVE_NUMBERS_ENABLED: "Relative line numbers enabled",
    ABSOLUTE_NUMBERS_ENABLED: "Absolute line numbers enabled",
    WHITESPACE_VISIBLE: "Whitespace is now visible",
    WHITESPACE_HIDDEN: "Whitespace is now hidden",
    FORMAT_SUCCESS: (format) => `Formatted as ${format.toUpperCase()}`,
    UPDATE_AVAILABLE: "A new version is available. Run :upgrade to reload.",
    OFFLINE_READY: "Scratchpad is ready to work offline",
    UP_TO_DATE: "Scratchpad is up to date"
};
