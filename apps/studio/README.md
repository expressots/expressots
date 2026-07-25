<div align="center">

  <h1>@expressots/studio</h1>

  <p>ExpressoTS Studio - Developer Experience Platform (CLI + UI).</p>

  <p>
    <a href="https://www.npmjs.com/package/@expressots/studio"><img src="https://img.shields.io/npm/v/@expressots%2Fstudio?style=flat-square&color=181717&logo=npm&logoColor=white" alt="npm"></a>
    <a href="https://github.com/expressots/expressots-studio/blob/main/LICENSE"><img src="https://img.shields.io/github/license/expressots/expressots-studio?style=flat-square&color=181717" alt="License"></a>
    <a href="https://discord.com/invite/PyPJfGK"><img src="https://img.shields.io/badge/Discord-join-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Discord"></a>
    <a href="https://github.com/expressots/expressots-studio/actions"><img src="https://img.shields.io/github/actions/workflow/status/expressots/expressots-studio/build.yml?branch=feature/v4.0&style=flat-square&logo=github&label=build" alt="Build"></a>
  </p>

</div>

## Installation

```bash
npm install -D @expressots/studio
```

## Quick Start

### CLI Usage

```bash
# Start Studio
npx expressots-studio start

# With options
npx expressots-studio start --port 3333 --agent-port 3334

# Show project info
npx expressots-studio info

# Clean Studio data
npx expressots-studio clean
```

### Programmatic Usage

```typescript
import { Studio } from '@expressots/studio';

const studio = new Studio({
  uiPort: 3333,
  agentPort: 3334,
  dbPath: '.studio/studio.db',
  srcPath: './src',
});

await studio.start();

// Studio is now running
// UI: http://localhost:3333
// Agent: ws://localhost:3334

// To stop
await studio.stop();
```

### Integration with ExpressoTS CLI

```bash
# Via ExpressoTS CLI (when integrated)
expressots studio
```

## CLI Commands

### `start` (default)

Start ExpressoTS Studio.

Options:
- `-p, --port <port>` - UI port (default: 3333)
- `-a, --agent-port <port>` - Agent WebSocket port (default: 3334)
- `-d, --db-path <path>` - Database path (default: .studio/studio.db)
- `--src <path>` - Source directory to scan (default: ./src)
- `--no-browser` - Don't open browser automatically

### `info`

Show information about the current project including discovered routes.

Options:
- `--src <path>` - Source directory to scan (default: ./src)

### `clean`

Remove all Studio data (database, cache).

Options:
- `-d, --db-path <path>` - Database path (default: .studio/studio.db)

## Configuration

You can also configure Studio via `expressots.config.ts`:

```typescript
// expressots.config.ts
export default {
  studio: {
    uiPort: 3333,
    agentPort: 3334,
    dbPath: '.studio/studio.db',
  },
};
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  ExpressoTS Studio                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐     │
│  │   Web UI    │  │ Studio Agent │  │ MCP Server │     │
│  │ :3333       │←→│ :3334        │←→│ (AI tools) │     │
│  └─────────────┘  └──────────────┘  └────────────┘     │
│         ↓              ↓                                 │
│  Your ExpressoTS App (instrumented)                     │
└─────────────────────────────────────────────────────────┘
```

## What's Included

- **Studio Agent**: Instrumentation, route discovery, request recording
- **Web UI**: Dashboard with trace visualization, architecture map, metrics
- **MCP Server**: AI-powered code generation tools (optional)

## License

MIT © ExpressoTS
