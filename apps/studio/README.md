# @expressots/studio

ExpressoTS Studio - Developer Experience Platform. The main package that orchestrates the Studio Agent and Web UI.

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
