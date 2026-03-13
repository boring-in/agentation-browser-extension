# Agentation — Browser Extension

Chrome extension that injects the [Agentation](https://www.npmjs.com/package/agentation) visual feedback widget on any website. Click elements, add notes, and copy structured CSS selectors — then sync everything to an MCP server so AI coding agents (Claude Code, Cursor, etc.) can see what you see.

## Features

- **One-click element selection** — click any element on a page to highlight it and grab its selector
- **MCP sync** — optionally forward session data to a local MCP server (`localhost:4747` by default) so your AI agent can consume it
- **Per-site control** — disable the widget on specific hostnames
- **Shadow DOM isolation** — the widget never interferes with page styles
- **Iframe-aware** — automatically skips host frames on embedded-app platforms (e.g. Shopify Admin) to avoid duplicates

## Install (development)

```bash
# Clone and install dependencies
git clone <repo-url> && cd agent-browser-extension
npm install

# Build the extension
npm run build        # production build
npm run dev          # development build with watch
```

Then load as an unpacked extension:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select this project folder

## Usage

1. Click the extension icon to open the popup
2. Toggle **Enabled** to inject the widget on the current page
3. (Optional) Enable **MCP Sync** and set the server URL to forward selections to your AI agent
4. Add hostnames to **Disabled Sites** to skip specific domains

## Project structure

```
├── background/          # Service worker — badge updates, config broadcast
├── content/             # Content script — injects Agentation widget via Shadow DOM
├── popup/               # Extension popup UI — settings & status
├── icons/               # Extension icons (16, 48, 128)
├── manifest.json        # Chrome MV3 manifest
├── webpack.config.js    # Build config
└── tsconfig.json        # TypeScript config
```

## Tech stack

- TypeScript, React 19, Webpack
- Chrome Extensions Manifest V3
- [`agentation`](https://www.npmjs.com/package/agentation) widget library

## License

MIT
