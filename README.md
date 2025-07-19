# Vim Scratchpad

## Project Overview

This is a browser-based vim scratchpad for taking scratch notes and quick coding. It provides a familiar vim editing experience with persistent storage across browser sessions.

### Core Features
- **Vim editing** with all standard modes (normal, insert, visual)
- **Syntax highlighting** for multiple programming languages
- **Persistent storage** of content, vim command history, and undo/redo history
- **Autosave** functionality to prevent data loss (only saves changed data)
- **Clean, minimal interface** with vim mode indicator
- **JavaScript execution** - Execute code from vim registers with `:js` and `:eval`
- **Register management** - Store and execute code snippets using vim's register system

## Development Preferences

### Package Management
- **Always use `pnpm`** instead of npm or yarn
- Run `pnpm run format` after making code changes to maintain consistent formatting
- Use `pnpm run format:check` to verify formatting

### Code Quality
- **Run prettier after code changes** - This project uses prettier for consistent formatting
- Prefer **4-space indentation**, double quotes, semicolons
- Keep code clean and readable

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

#### Current Language Support
Official CM6 packages only (with shorthand aliases):
- **JavaScript/TypeScript** (`js`, `ts`, `jsx`, `tsx`) - Full language support with variants
- **Web languages** (`json`, `css`, `html`) - Frontend development
- **Data formats** (`yaml`/`yml`, `xml`, `sql`) - Configuration and data
- **Programming languages** (`go`, `python`/`py`) - Backend development  
- **Documentation** (`markdown`/`md`) - Notes and documentation

#### Storage Strategy
- **localStorage for everything** - content, vim history, editor state
- **Optimized autosave** - Only saves data when it has actually changed (every 5 seconds)
- **State serialization** - Use CM6's built-in `toJSON`/`fromJSON` for editor state persistence
- **Modular state management** - All persistence logic isolated in `state-manager.js`

#### UI/UX Principles
- **Minimal interface** - Focus on the editor
- **Vim-first experience** - All interactions should feel natural to vim users
- **Nord theme** - Consistent dark theme throughout
- **Visual feedback** - Mode indicator, proper syntax highlighting

## Technical Implementation Notes

### Key Files
- `script.js` - Main application logic, editor setup, vim commands
- `state-manager.js` - All persistence and state management functionality
- `style.css` - UI styling with Nord color scheme
- `index.html` - Minimal HTML structure
- `.prettierrc` - Code formatting configuration

### Persistence Strategy
The app persists:
1. **Document content** (`vim-scratchpad-content`)
2. **File type** (`vim-scratchpad-filetype`)
3. **Vim command history** (`vim-command-history`)
4. **Vim search history** (`vim-search-history`)
5. **Complete editor state** (`editor-state`) including undo/redo history

### Vim Integration
- Use `getCM(editorView)` to access vim functionality
- Listen to `vim-mode-change` events for mode indicator
- Define custom vim commands with `Vim.defineEx()`
- Access vim history via `Vim.getVimGlobalState_()`
- Access vim registers via `registerController.unnamedRegister.keyBuffer[0]`

### CodeMirror 6 Patterns
- Use `Compartment` for dynamic language switching
- Serialize state with `stateFields = { history: historyField }`
- Handle state restoration gracefully with try/catch fallbacks

### JavaScript Code Execution
The scratchpad includes a powerful code execution system:

#### Basic Usage
- **Current line**: Run `:js` or `:eval` on any line with JavaScript
- **Visual selection**: Select code, yank with `y`, then run `:js`
- **Named registers**: Yank to register (`"ay`), execute with `:js a`

#### Advanced Features
- **Register inspection**: Use `:registers` to view all register contents
- **Error handling**: Syntax errors and runtime errors are displayed safely
- **Result display**: Results appear in a styled popup with Nord theme colors
- **Multiple result types**: Handles objects (JSON), functions, primitives, undefined/null

#### Workflow Examples
```javascript
// Single line - just run :js
Math.random() * 100

// Multi-line - select, yank, :js
const x = 5;
const y = 10;
x + y

// Named registers - select, "ay, then :js a
const users = [{name: "Alice"}, {name: "Bob"}];
users.map(u => u.name.toUpperCase());
```

## Development Workflow

1. **Making changes**: Edit source files normally
2. **Formatting**: Run `pnpm run format` after changes
3. **Testing**: Use `pnpm run dev` to start development server
4. **Language changes**: Use `:set ft=<language>` in the editor

## Feature Implementation Philosophy

### When adding new features:
1. **Check if CodeMirror 6 has it built-in** first
2. **Leverage existing vim patterns** from @replit/codemirror-vim
3. **Maintain backward compatibility** with existing localStorage data
4. **Keep the interface minimal** - avoid UI bloat
5. **Test persistence** - Ensure features work across page refreshes
6. **Optimize for vim users** - Use vim's register system rather than custom selection handling
7. **Prefer modular architecture** - Separate concerns into focused files

### Avoid:
- Heavy external dependencies
- Custom reinvention of editor functionality  
- Breaking changes to existing storage format
- UI complexity that distracts from editing
- Complex visual selection capture - use vim's register system instead

## Key Technical Learnings

### Vim Integration Patterns
- **Mode transitions clear selections** - When entering command mode (`:`) from visual, selections are lost
- **Register system is more reliable** - Use `"ay` to yank, then access `keyBuffer[0]` rather than trying to capture selections
- **Vim global state access** - `Vim.getVimGlobalState_().registerController` provides register access
- **Mode change events work well** - `vim-mode-change` events are reliable for UI updates

### CodeMirror 6 State Management  
- **State serialization is powerful** - `toJSON()`/`fromJSON()` handles complex undo/redo history
- **Compartments enable dynamic changes** - Language switching without recreating the editor
- **Graceful fallbacks matter** - Always handle state restoration failures
- **Change detection saves performance** - Only write to localStorage when data actually changes

### Architecture Insights
- **Separate state management early** - Isolating persistence logic prevents coupling
- **Prefer existing library patterns** - Don't reinvent vim behaviors, use the library's systems
- **Optimize for the 90% case** - Single-line execution is most common, multi-line via registers
- **Vim users expect vim patterns** - Yanking to registers feels natural vs. custom selection handling

## Success Metrics

The scratchpad is successful when:
- **It feels like vim** - All standard vim patterns work intuitively
- **Nothing is lost** - All content, history, and state persists reliably
- **It's fast** - No noticeable lag during editing or mode switches
- **It's reliable** - Works consistently across browser sessions

This is a tool for developers who want a familiar vim environment for quick notes and code snippets without the overhead of a full IDE.
