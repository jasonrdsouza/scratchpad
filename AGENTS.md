# Scratchpad - Agent Guide

Development notes for working on this codebase. User-facing documentation lives in [README.md](README.md). `CLAUDE.md` is a symlink to this file.

## Development Preferences

### Package Management

- **Always use `pnpm`** instead of npm or yarn
- `pnpm run dev` - development server
- `pnpm test` - run the Vitest suite
- `pnpm run build` - production build (also generates the service worker)
- `pnpm run format` / `pnpm run format:check` - Prettier

CI (`.github/workflows/build.yml`) runs `format:check`, `test` and `build` on pushes and PRs to `main`, and creates a GitHub release for `v*` tags.

### Code Quality

- **Run `pnpm run format` after code changes** - CI fails on unformatted code
- **Run `pnpm test`** and add tests for new logic (see Testing below)
- Prefer **4-space indentation**, double quotes, semicolons
- Keep code clean and readable

### Testing

- Tests live in `test/` and use Vitest in a Node environment
- Pure modules (`formatting.js`, `execution/formatters.js`) are tested directly
- `state-manager.js` tests stub `localStorage` with `vi.stubGlobal`
- `test/python.test.js` runs real Python via the locally installed Pyodide runtime (`indexURL` pointing at `node_modules/pyodide/`, `preloadPackages: []`); packages not bundled with the npm package (e.g. numpy) are fetched from the CDN, so it needs network access
- UI behavior (popups, PWA, multi-tab) isn't covered by unit tests - verify it in a browser against `pnpm run build && pnpm exec vite preview`

### Architecture Decisions

#### Language & Framework Choices

- **Vanilla JavaScript** - No heavy frameworks, keep it lightweight
- **CodeMirror 6** - Modern, performant editor with good vim support
- **@replit/codemirror-vim** - Best vim implementation for CM6

#### Dependency Strategy

- **Prefer official CodeMirror 6 packages** over third-party or legacy alternatives
- **Avoid legacy modes** - Only use native CM6 language support
- **Leverage existing library functionality** instead of reinventing features
- **Stay up-to-date** with CodeMirror ecosystem
- `@babel/runtime` is required at runtime by the `@uiw` theme packages, even though nothing imports it directly
- `workbox-window` must be a direct dependency for `vite-plugin-pwa` to resolve it under pnpm

#### Current Language Support

Official CM6 packages only (with shorthand aliases):

- **JavaScript/TypeScript** (`js`, `ts`, `jsx`, `tsx`)
- **Web languages** (`json`, `css`, `html`)
- **Data formats** (`yaml`/`yml`, `xml`, `sql`)
- **Programming languages** (`go`, `python`/`py`)
- **Documentation** (`markdown`/`md`)

#### Storage Strategy

- **localStorage for everything** - content, vim history, editor state
- **Optimized autosave** - Only saves data when it has actually changed (every 5 seconds, and when the page is hidden or closed)
- **Multiple tabs** - A tab only writes content it has edited since its last load/save, and adopts content saved by other tabs (via the `storage` event) when it has no unsaved edits
- **State serialization** - Use CM6's built-in `toJSON`/`fromJSON` for editor state persistence
- **Content is the source of truth** - Saved editor state is only restored if its document matches the saved content, and only saved when it matches; otherwise it's stale and discarded
- **Modular state management** - All persistence logic isolated in `state-manager.js`

#### Offline / PWA

- `vite-plugin-pwa` (Workbox `generateSW`) generates the manifest and service worker at build time; config lives in `vite.config.js`
- The app shell is precached. Pyodide's runtime and packages are runtime-cached (cache-first) from `cdn.jsdelivr.net/pyodide/` on first use; the URLs are versioned, so cache-first is safe
- `clientsClaim` makes the service worker control the page on first install, so the first visit's Pyodide downloads are cached
- `registerType: "prompt"` - updates never reload mid-edit. `pwa.js` shows a popup and `:upgrade` saves, activates the waiting worker and reloads on `controllerchange` (the plugin's own reload only fires if the page was controlled at load)
- Fonts (`@fontsource/fira-code`) and icons (`public/icons/`) are self-hosted; avoid adding runtime requests to other origins

#### UI/UX Principles

- **Minimal interface** - Focus on the editor
- **Vim-first experience** - All interactions should feel natural to vim users
- **Theme-aware UI** - The popup, mode indicator and command line take their colors from the active editor theme (`applyThemeColors` sets `--editor-bg`/`--editor-fg` and `data-theme-type`); light themes use a darker accent palette. Nord is the default theme
- **Visual feedback** - Mode indicator, proper syntax highlighting

## Technical Implementation Notes

### Module Responsibilities

- **`script.js`** - Editor setup: extensions, language definitions, compartments, mode indicator, startup wiring
- **`config.js`** - Constants: storage keys, defaults, timings, theme lists, messages
- **`state-manager.js`** - Persistence: localStorage with change detection, editor state (de)serialization, vim history, autosave and multi-tab sync
- **`commands.js`** - Vim ex commands (`:w`, `:q`, `:set`, `:js`/`:py`, `:registers`, `:fmt`, `:help`, `:whitespace`, `:colorscheme`/`:theme`, `:relativenumber`), the result popup (`showExecutionResult`), and `getCommandRange` for ex command ranges
- **`help.js`** - `:help` content and topics
- **`formatting.js`** - `:fmt` implementations (JSON, clean, table)
- **`theme-manager.js`** - Theme registry, persistence, switching, and applying theme colors to the surrounding UI
- **`pwa.js`** - Service worker registration, update prompt and `:upgrade`
- **`execution/`** - Execution engine
    - `engine.js` - Coordinates executors (one per language, with aliases), formats results, stores them in the `"r` register
    - `executor.js` - `Executor` base class and `OutputResult` (printed output + value)
    - `javascript.js` - Indirect `eval` (global scope), awaits promises
    - `python.js` - Pyodide: lazy loading, package preloading and auto-loading from imports, print capture, result conversion
    - `formatters.js` - Result formatting for all value types
    - `registers.js` - Stores results via vim's register API
- **`style.css`** - Styling, using CSS variables for theme colors
- **`vite.config.js`** - Build and PWA configuration

### Persistence Keys

1. **Document content** (`vim-scratchpad-content`)
2. **File type** (`vim-scratchpad-filetype`)
3. **Theme preference** (`vim-scratchpad-theme`)
4. **Wrap** (`vim-scratchpad-wrap`) and **relative line numbers** (`vim-scratchpad-relativenumber`)
5. **Vim command history** (`vim-command-history`) and **search history** (`vim-search-history`)
6. **Complete editor state** (`editor-state`) including undo/redo history

### Vim Integration

- Use `getCM(editorView)` to access vim functionality
- Listen to `vim-mode-change` events for the mode indicator (vim doesn't emit one for the initial normal mode)
- Define custom vim commands with `Vim.defineEx()`
- Ex command ranges arrive as `params.line`/`params.lineEnd`, **0-based**; use `getCommandRange` rather than reimplementing range handling
- Pressing `:` in visual mode prefills `'<,'>`, so visual selections reach commands as ranges
- Use `params.argString` (raw, untrimmed) when whitespace matters; `params.args` is split on whitespace
- Access vim history and registers via `Vim.getVimGlobalState_()` (`registerController.unnamedRegister` / `registerController.registers[name]`, text in `keyBuffer[0]`)

### Code Execution Semantics

- `:js`/`:py` with no argument run the current line, or the command's range (`:'<,'>js`, `:10,20js`)
- A single-character argument runs that register only if it's a letter (or `"`) and non-empty; anything else is inline code
- JavaScript runs in global scope: `var`, functions and bare assignments persist; `const`/`let` don't
- Python: `runPythonAsync` (top-level `await` works), `print()` output is captured into an `OutputResult`, dicts convert to plain objects, numpy values go through `.tolist()`, and objects with no JS equivalent fall back to `str()`
- The Pyodide CDN URL is derived from the installed package version - `loadPyodide` rejects mismatched runtime files

### CodeMirror 6 Patterns

- Use `Compartment` for dynamic language, theme, wrap, whitespace and line number switching
- Serialize state with `stateFields = { history: historyField }`
- Handle state restoration gracefully with try/catch fallbacks
- Theme styles apply synchronously on dispatch, so computed colors can be read right after switching

## Feature Implementation Philosophy

### When adding new features:

1. **Check if CodeMirror 6 has it built-in** first
2. **Leverage existing vim patterns** from @replit/codemirror-vim
3. **Maintain backward compatibility** with existing localStorage data
4. **Keep the interface minimal** - avoid UI bloat
5. **Test persistence** - Ensure features work across page refreshes (and across tabs)
6. **Work offline** - Don't add network dependencies the service worker can't cache
7. **Use the execution engine** - For new language support, implement the `Executor` interface
8. **Follow modular architecture** - Separate concerns into focused files

### Avoid:

- Heavy external dependencies
- Custom reinvention of editor functionality
- Breaking changes to existing storage format
- UI complexity that distracts from editing
- Hardcoded colors in UI chrome - use the theme CSS variables
- Adding execution logic directly to `commands.js` - use the execution engine

## Documentation Policy

**IMPORTANT**: Keep the docs current after any:

- **Architectural changes** - New files, moved functions, refactored modules (update this file)
- **New features** - Commands, language support, UI changes (update README.md and `:help`)
- **Development workflow changes** - Build process, formatting, testing, dependencies (update this file)
- **Key learnings** - Technical insights, debugging discoveries, implementation patterns (update this file)

**When adding new vim commands or functionality:**

1. **Update `:help`** - Add the command to `help.js` (main help and/or a topic)
2. **Update README.md** - Document the feature for users
3. **Check `:help`** displays the new functionality correctly

## Success Metrics

The scratchpad is successful when:

- **It feels like vim** - All standard vim patterns work intuitively
- **Nothing is lost** - All content, history, and state persists reliably
- **It's fast** - No noticeable lag during editing or mode switches
- **It's reliable** - Works consistently across browser sessions, tabs, and offline
