<div align="center">
  <a href="https://expresso-ts.com">
    <img src="https://github.com/expressots/expressots/blob/main/media/expressots.png" alt="ExpressoTS" width="120">
  </a>

  <h1>ExpressoTS Studio</h1>

  <p>Developer experience platform for route discovery, request recording, live logs, error analysis, and security insights.</p>

  <p>
    <a href="https://www.npmjs.com/package/@expressots/studio"><img src="https://img.shields.io/npm/v/@expressots%2Fstudio?style=flat-square&color=181717&logo=npm&logoColor=white" alt="npm"></a>
    <a href="https://github.com/expressots/expressots-studio/blob/main/expressots/LICENSE.md"><img src="https://img.shields.io/github/license/expressots/expressots-studio?style=flat-square&color=181717" alt="License"></a>
    <a href="https://discord.com/invite/PyPJfGK"><img src="https://img.shields.io/badge/Discord-join-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Discord"></a>
    <a href="https://github.com/expressots/expressots-studio/actions"><img src="https://img.shields.io/github/actions/workflow/status/expressots/expressots-studio/build.yml?branch=main&style=flat-square&logo=github&label=build" alt="Build"></a>
  </p>

  <p>
    <a href="https://doc.expresso-ts.com">Documentation</a> ·
    <a href="https://doc.expresso-ts.com/docs/core/first-steps">Getting Started</a> ·
    <a href="https://github.com/orgs/expressots/projects/5">Project Board</a> ·
    <a href="https://discord.com/invite/PyPJfGK">Community</a>
  </p>
</div>

---

## Install

```bash
npm install -D @expressots/studio @expressots/studio-agent
```

## What This Package Does

Studio adds a local developer dashboard on top of any ExpressoTS application: route discovery, HTTP recording to SQLite, live logs, runtime error analysis, supply-chain security checks, and a built-in API client. Everything runs locally. Nothing leaves your machine.

## Packages

| Package | Role |
| --- | --- |
| `@expressots/studio` | CLI, orchestrator, and bundled web UI |
| `@expressots/studio-agent` | In-app instrumentation, tracing, recording, and log capture |

## Quick Look

```bash
npx expressots-studio
# or: expressots studio
```

Studio auto-activates when `@expressots/studio-agent` is installed and `NODE_ENV` is `development`. Set `EXPRESSOTS_STUDIO=false` to opt out.

## Features

| View | What it does |
| --- | --- |
| Status Dashboard | App health, runtime info, DI scope counts, top routes, security score |
| Architecture Map | Read-only graph of controllers, use-cases, providers, and middleware |
| Request Timeline | Live recording with per-route P50/P95/P99 and error rate |
| Live Logs | Filterable log buffer by level, route, and context |
| Error Inspector | Aggregated runtime errors with stack frames and source deep-links |
| Security View | npm audit + OSV advisories, OWASP API Top 10 posture findings |
| API Client | Built-in HTTP client for firing requests at your app |

## Documentation

For guides, API reference, architecture patterns, and examples visit **[doc.expresso-ts.com](https://doc.expresso-ts.com)**.

## Contributing

Welcome to the ExpressoTS community. See the [Contributing Guide](https://github.com/expressots/expressots/blob/main/CONTRIBUTING.md) for how to get involved.

## Support the project

- [GitHub Sponsors](https://github.com/sponsors/expressots)
- [Star the organization](https://github.com/expressots) on GitHub
- [Discord](https://discord.com/invite/PyPJfGK)
- [Report an issue](https://github.com/expressots/expressots-studio/issues)

## License

MIT. See [LICENSE](../expressots/LICENSE.md).

