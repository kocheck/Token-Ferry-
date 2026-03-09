# Token Ferry

Ferry design tokens back and forth between Figma and GitHub.

## Features

- **Push to GitHub**: Serialize Figma variables to DTCG-compatible JSON, create a branch, commit, and open a Pull Request
- **Pull from GitHub**: Fetch token JSON from a repo, preview changes, and create/update Figma variables
- **Canvas Visualization**: Render color variable cards with WCAG contrast ratios and alias connector arrows

## Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Build the plugin:
   ```bash
   npm run build
   ```

3. In Figma: Plugins → Development → Import plugin from manifest → select `manifest.json`

4. Configure the plugin:
   - Enter your GitHub repo (`owner/repo`)
   - Set the token file path (default: `tokens/design-tokens.json`)
   - Set the base branch (default: `main`)
   - Enter a GitHub Personal Access Token with `repo` scope

## Development

```bash
npm run watch    # Rebuild on file changes
npm run typecheck # Type-check without emitting
```

## Architecture

```
src/
├── types.ts              # Shared interfaces and message protocol
├── code.ts               # Plugin sandbox entry point
├── github-api.ts         # GitHub REST API (runs in UI iframe)
├── storage.ts            # figma.clientStorage wrapper
├── variables-reader.ts   # Read Figma variables (async API)
├── json-formatter.ts     # Variables → DTCG JSON
├── json-parser.ts        # DTCG JSON → parsed tokens
├── variables-writer.ts   # Create/update Figma variables
├── canvas-renderer.ts    # Canvas card visualization
├── contrast-utils.ts     # WCAG contrast calculations
├── ui.html               # Plugin UI template
└── ui.ts                 # UI logic + GitHub API calls
```

## Token Format

Tokens are serialized as [DTCG](https://design-tokens.github.io/community-group/format/)-compatible JSON with Figma metadata in `$extensions`.

## License

MIT
