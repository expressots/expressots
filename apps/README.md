<div align="center">
  <a href="https://expresso-ts.com">
    <img src="https://github.com/expressots/expressots/blob/main/media/expressots.png" alt="ExpressoTS" width="120">
  </a>

  <h1>ExpressoTS Studio</h1>

  <p>Developer experience platform — route discovery, request recording, live logs, error analysis, and security insights for ExpressoTS applications.</p>

  <p>
    <a href="https://www.npmjs.com/package/@expressots/studio"><img src="https://img.shields.io/npm/v/@expressots/studio?style=flat&color=0d0d0d" alt="npm"></a>
    <a href="https://github.com/expressots/expressots/blob/main/LICENSE.md"><img src="https://img.shields.io/github/license/expressots/expressots?style=flat&color=0d0d0d" alt="License"></a>
    <a href="https://discord.com/invite/PyPJfGK"><img src="https://img.shields.io/badge/Discord-join-0d0d0d?logo=discord&logoColor=white" alt="Discord"></a>
  </p>

  <p>
    <a href="https://doc.expresso-ts.com">Documentation</a> ·
    <a href="https://doc.expresso-ts.com/docs/core/first-steps">Getting Started</a> ·
    <a href="https://discord.com/invite/PyPJfGK">Community</a>
  </p>
</div>

---

## Install

```bash
npm install -D @expressots/studio @expressots/studio-agent
```

## What This Package Does

Studio adds a local developer dashboard on top of any ExpressoTS application. It discovers routes, records HTTP requests to SQLite, captures logs, surfaces runtime errors with source links, runs supply-chain and OWASP security analysis, and includes a built-in API client. Everything runs on your machine — nothing leaves it.

## Packages

| Package | Role |
| --- | --- |
| `@expressots/studio` | CLI, orchestrator, and bundled web UI |
| `@expressots/studio-agent` | In-app instrumentation, tracing, recording, and log capture |
| `@expressots/mcp-server` | AI integration via Model Context Protocol (preview) |

## Quick Look

```bash
# Launch Studio
npx expressots-studio

# Or via the framework CLI
expressots studio
```

Studio auto-activates when `@expressots/studio-agent` is installed and `NODE_ENV` is `development`. Set `EXPRESSOTS_STUDIO=false` to opt out.

## Features

| View | What it does |
| --- | --- |
| Status Dashboard | App health, runtime info, DI scope counts, top routes, security score |
| Architecture Map | Read-only graph of controllers, use-cases, providers, and middleware |
| Request Timeline | Live recording with per-route P50/P95/P99 and error rate |
| Trace Detail | OpenTelemetry spans per request with headers/body diff and replay |
| Live Logs | Filterable log buffer by level, route, and context |
| Error Inspector | Aggregated runtime errors with stack frames and source deep-links |
| Security View | `npm audit` + OSV.dev advisories, OWASP API Top 10 posture findings |
| API Client | Built-in HTTP client for firing requests at your app |

## Documentation

For guides, configuration, and the full feature reference visit **[doc.expresso-ts.com](https://doc.expresso-ts.com)**.

## Contributing

See the [Contributing Guide](https://github.com/expressots/expressots/blob/main/CONTRIBUTING.md) for how to get involved.

## Support

- [GitHub Sponsors](https://github.com/sponsors/expressots)
- [Discord](https://discord.com/invite/PyPJfGK)
- [Report an Issue](https://github.com/expressots/expressots/issues)

## License

MIT — see [LICENSE](../expressots/LICENSE.md).
