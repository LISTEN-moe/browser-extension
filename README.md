<div align="center">
	<p>
		<img src="https://lolisafe.moe/DJwzPbWD.png" />
	</p>
	<br />
	<p align="center">
		<a href="https://chrome.google.com/webstore/detail/listenmoe/bjhaeboalljjbggiljjokojcedhmkfoa?hl=en" target="_blank">
			<img src="https://img.shields.io/chrome-web-store/v/bjhaeboalljjbggiljjokojcedhmkfoa.svg?style=flat-square&maxAge=3600" alt="Chrome Web Store">
		</a>
		<a href="https://addons.mozilla.org/en-US/firefox/addon/listen-moe-extension/" target="_blank">
			<img src="https://img.shields.io/amo/v/listen-moe-extension.svg?style=flat-square&maxAge=3600" alt="Firefox Addons">
		</a>
	</p>
</div>

# Official LISTEN.moe Extension

A browser extension for [LISTEN.moe](https://listen.moe) - stream anime and J-pop/K-pop radio directly from your browser.

## Features

- Stream JPOP and KPOP radio stations
- Now playing display with song title, artist, character CV info, and album art
- Song progress tracking via metadata stream
- Favorite songs (requires a LISTEN.moe account)
- Song change and event notifications
- Volume control with mouse wheel support
- Keyboard shortcuts
- Autoplay on browser start
- Fallback stream support

## Tech Stack

- [WXT](https://wxt.dev) - cross-browser extension framework
- [Vue 3](https://vuejs.org) - UI with Composition API and `<script setup>`
- [TypeScript](https://www.typescriptlang.org)
- [Bun](https://bun.sh) - runtime and package manager

## Development

```bash
# Install dependencies
bun install

# Development (Chrome)
bun run dev

# Development (Firefox)
bun run dev:firefox

# Build (Chrome)
bun run build

# Build (Firefox)
bun run build:firefox

# Lint
bun run lint
```

## Architecture

```
src/
├── components/          # Vue components (AlbumArt, NowPlaying, PlayerControls, etc.)
├── composables/         # Vue composables (useRadioState, useSongProgress)
├── entrypoints/
│   ├── background.ts    # Service worker / background script
│   ├── offscreen/       # Chrome MV3 offscreen document for audio playback
│   └── popup/           # Popup UI entry point
├── types/               # TypeScript interfaces and message types
└── utils/               # Shared utilities (websocket, storage, graphql, etc.)
```

- **Chrome**: MV3 service worker + offscreen document for audio
- **Firefox**: MV2 background page with direct audio access
