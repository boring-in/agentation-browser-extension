# Agentation — Browser Extension

Chrome extension that injects the [Agentation](https://github.com/benjitaylor/agentation) visual feedback widget on any website. Click elements, add notes, and copy structured CSS selectors — then sync everything to an MCP server so AI coding agents (Claude Code, Cursor, etc.) can see what you see.

## Features

- **One-click element selection** — click any element on a page to highlight it and grab its selector
- **Annotation sync** — annotations (add, edit, delete, clear) are forwarded to the MCP server in real-time
- **Console error capture** — intercepts `console.error`, `window.onerror`, and unhandled promise rejections; deduplicated and sent to MCP as annotations or copied as markdown
- **Project ID** — each page is tagged with `hostname:port` so AI agents can filter by project
- **MCP server status** — popup shows whether the MCP server is online or offline
- **Auto-save** — settings apply immediately, no save button needed
- **Version check** — popup shows when a newer agentation version is available
- **Per-site control** — block the widget on specific sites with one click
- **Shadow DOM isolation** — the widget never interferes with page styles
- **Iframe-aware** — skips host frames on embedded-app platforms (e.g. Shopify Admin)

## Install

```bash
git clone <repo-url> && cd agentation-browser-extension

# Linux / macOS
./install.sh

# Windows — double-click install.bat, or in PowerShell:
.\install.ps1
```

The install script will:
1. Install npm dependencies
2. Build the extension
3. Copy `/ag:check` and `/ag:loop` commands to `~/.claude/commands/`

Then load the extension in Chrome:
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select this project folder

## MCP Server

The MCP server receives annotations from the browser extension and makes them available to AI agents.

```bash
# Linux / macOS — toggle start/stop
./mcp-server.sh

# Windows — double-click mcp-server.bat, or in PowerShell:
.\mcp-server.ps1
```

The script will:
- Check for agentation updates and rebuild automatically
- Start the server in the background (default port 4747)
- Run again to stop it

## Claude Code commands

Copy these to your project or install globally via the install script.

| Command | Description |
|---------|-------------|
| `/ag:check` | Fetch pending annotations from the MCP server, acknowledge them, make fixes, and resolve |
| `/ag:loop` | Run `/ag:check` every 30 seconds via subagent until stopped |

## Usage

1. Click the extension icon to open the popup
2. Toggle **Enabled** to inject the widget
3. Enable **MCP Sync** to forward annotations to the server
4. Enable **Console Errors** to capture runtime errors from the page
   - With MCP Sync on: errors are automatically sent as annotations (`intent: fix`, `severity: blocking`)
   - Without MCP: use **Copy errors** to copy deduplicated errors as markdown
   - Duplicate errors are consolidated — only unique errors are sent/shown, with a repeat count
5. Start the MCP server with `./mcp-server.sh` (or `mcp-server.bat` on Windows)
6. In Claude Code, run `/ag:check` or `/ag:loop` to process annotations

## Tech stack

- TypeScript, React 19, Webpack
- Chrome Extensions Manifest V3
- [`agentation`](https://github.com/benjitaylor/agentation) widget library

## License

MIT
