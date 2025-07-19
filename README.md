# Vim Scratchpad

## Project Overview

This is a browser-based vim scratchpad for taking scratch notes and quick coding. It provides a familiar vim editing experience with persistent storage across browser sessions.

### Core Features
- **Vim editing** with all standard modes (normal, insert, visual)
- **Syntax highlighting** for multiple programming languages
- **Persistent storage** of content, vim command history, and undo/redo history
- **Autosave** functionality to prevent data loss
- **Clean, minimal interface** with vim mode indicator

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
Official CM6 packages only:
- JavaScript/TypeScript (with JSX/TSX variants)
- JSON, CSS, HTML, SQL
- YAML, XML, Go
- Python, Markdown

#### Storage Strategy
- **localStorage for everything** - content, vim history, editor state
- **Unified autosave** - All data saved together every 5 seconds
- **State serialization** - Use CM6's built-in `toJSON`/`fromJSON` for editor state persistence

#### UI/UX Principles
- **Minimal interface** - Focus on the editor
- **Vim-first experience** - All interactions should feel natural to vim users
- **Nord theme** - Consistent dark theme throughout
- **Visual feedback** - Mode indicator, proper syntax highlighting

## Technical Implementation Notes

### Key Files
- `script.js` - Main application logic
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

### CodeMirror 6 Patterns
- Use `Compartment` for dynamic language switching
- Serialize state with `stateFields = { history: historyField }`
- Handle state restoration gracefully with try/catch fallbacks

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

### Avoid:
- Heavy external dependencies
- Custom reinvention of editor functionality  
- Breaking changes to existing storage format
- UI complexity that distracts from editing

## Success Metrics

The scratchpad is successful when:
- **It feels like vim** - All standard vim patterns work intuitively
- **Nothing is lost** - All content, history, and state persists reliably
- **It's fast** - No noticeable lag during editing or mode switches
- **It's reliable** - Works consistently across browser sessions

This is a tool for developers who want a familiar vim environment for quick notes and code snippets without the overhead of a full IDE.
