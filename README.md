# SimpleGhost

SimpleGhost is a transparent desktop overlay that analyses a screenshot with the Gemini API and streams a concise answer into the window. It is intended for practice sessions and content you are permitted to capture.

## Requirements

- Node.js 22.12 or newer
- macOS 13 or newer, Windows 10+, or a current 64-bit Linux distribution
- A [Gemini API key](https://ai.google.dev/gemini-api/docs/api-key)

## Setup

```bash
npm install
cp .env.example .env
```

Add your key to `.env`, then run `npm start`.

Use the on-screen **Analyse** button or the keyboard shortcut. The on-screen controls remain available if a global shortcut is already used by another application.

On macOS, approve Screen Recording when prompted in **System Settings → Privacy & Security → Screen & System Audio Recording**.

## Shortcuts

- `Command/Ctrl + 1`: capture and analyse the primary display
- `Command/Ctrl + 2`: clear the answer
- `Command/Ctrl + Shift + H`: hide or show the overlay
- `Command/Ctrl + Shift + W`: quit

## Configuration

`GEMINI_MODEL` is optional and defaults to `gemini-3.7-flash`.

```dotenv
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-3.7-flash
```

The API key stays in Electron's main process. Screenshot bytes are sent directly to Gemini and are not written to disk.

## Development

```bash
npm run check
npm test
npm run test:python
npm run pack
```

The renderer runs with context isolation, sandboxing, and Node integration disabled. `preload.js` exposes only the operations the interface needs.
Packaged builds also disable Electron's RunAsNode, Node options, and CLI inspector fuses.

## Packaging

Run `npm run dist`. Unsigned local builds work for development; distribution to other macOS users requires an Apple Developer ID certificate and notarization.
