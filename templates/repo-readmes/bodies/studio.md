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
