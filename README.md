# Scratchpad

A browser based, web first, vim backed, AI assisted scratchpad for quick notes, brainstorming, and brain dumping.

**Live at [scratch.dsouza.io](https://scratch.dsouza.io)**

## Features

- **Vim editing** - normal, insert, visual (`v`, `V`, and `Ctrl+Q` for block, since `Ctrl+V` is the browser's paste) and replace modes, with registers, search and ex commands
- **Everything persists** - content, undo/redo history, vim command and search history, and settings are saved in your browser automatically
- **Works offline** - install it as an app; once loaded it works without a connection, including Python after its first use
- **Multi-tab safe** - tabs pick up content saved in other tabs instead of overwriting it
- **Run code** - JavaScript and Python (via Pyodide, with numpy, pandas and requests) from the current line, a selection, a register or inline
- **Formatting** - pretty-print JSON, clean up whitespace, and turn CSV/TSV into aligned tables
- **Syntax highlighting** for markdown, JavaScript/TypeScript, Python, Go, JSON, YAML, HTML, CSS, SQL and XML
- **14 themes**, light and dark

## Installing

Open [scratch.dsouza.io](https://scratch.dsouza.io) and use your browser's install option (e.g. the install icon in Chrome's address bar). The app updates itself in the background; when a new version is ready you'll see a prompt to run `:upgrade`.

## Commands

Run `:help` in the editor for the full list, or `:help <topic>` (`js`, `py`, `fmt`, `theme`, `whitespace`, `relativenumber`).

| Command                                         | What it does                                            |
| ----------------------------------------------- | ------------------------------------------------------- |
| `:w`, `:q`, `:wq`                               | Save, close the window, both                            |
| `:set ft=<lang>`                                | Syntax highlighting (`md`, `js`, `ts`, `py`, `go`, ...) |
| `:set wrap` / `:set nowrap`                     | Soft line wrapping                                      |
| `:set rnu` / `:set nornu`                       | Relative / absolute line numbers                        |
| `:colo <theme>`, `:theme <theme>`               | Switch theme (no argument lists themes)                 |
| `:whitespace`                                   | Toggle visible whitespace                               |
| `:fmt`, `:fmt json`, `:fmt clean`, `:fmt table` | Format the current line, selection or range             |
| `:js`, `:py`                                    | Run code (see below)                                    |
| `:registers`, `:registers r`                    | Show registers                                          |
| `:upgrade`                                      | Reload to apply an app update                           |

## Running Code

`:js` (or `:eval`) runs JavaScript and `:py` (or `:python`) runs Python:

- `:js` - run the current line
- Select lines with `V`, then type `:js` (it becomes `:'<,'>js`) to run the selection; or give a range like `:10,20py`
- `:js Math.PI * 2` - run inline code
- `:js a` - run register `a` (yank into it with `"ay`); `:js "` runs the last yank
- Results appear in a popup and are stored in the `"r` register, so `"rp` pastes the last result

JavaScript runs in the page's global scope, so `var` and function declarations carry over between runs. Python supports top-level `await`, shows `print()` output alongside the result, and loads other Pyodide packages (e.g. `scipy`) automatically when imported. The first Python run downloads the runtime, which takes a few seconds.

```
// Multi-line: select the two lines below with V, then :'<,'>js
const users = [{ name: "Alice" }, { name: "Bob" }];
users.map((u) => u.name.toUpperCase());
```

## Development

```sh
pnpm install
pnpm run dev      # development server
pnpm test         # tests
pnpm run build    # production build in dist/
```

See [AGENTS.md](AGENTS.md) for architecture, conventions and development notes.

## Deploying

Pushing a `v*` tag builds the site and publishes it as a GitHub release. On the server, run [`scripts/deploy.sh`](scripts/deploy.sh) to download the latest release and install it into `/var/www/scratchpad`:

```sh
sudo ./deploy.sh
```
