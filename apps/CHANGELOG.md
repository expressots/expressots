## [4.0.0](https://github.com/expressots/expressots-studio/releases/tag/v4.0.0) (2026-07-16)

First public release of ExpressoTS Studio. Part of the ExpressoTS **v4.0.0 release bundle**. See the [v4.0.0 release notes](https://expresso-ts.com/docs/4.0.0/prologue/release) and the [Studio section of the docs](https://expresso-ts.com/docs/4.0.0/studio/overview).

Studio is developed as three packages in this monorepo. Two of them are published to npm:

| Package                    | Published | Purpose                                                                                                                                                                                                |
| -------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@expressots/studio`       | Yes       | CLI + bundled web UI you run on your laptop. Boots the UI, probes the agent, opens the browser.                                                                                                        |
| `@expressots/studio-agent` | Yes       | Loaded into the app process: instrumentation middleware, SQLite recorder, log capture, DI snapshot, security engine, Socket.IO server. Optional peer dependency of `@expressots/adapter-express`.      |
| `@expressots/mcp-server`   | No        | Stdio MCP server for Claude Desktop, Cursor, and other AI editors. **Private and not published in 4.0**; it lives in the monorepo and will ship in a later release.                                    |

### Features

* **Status dashboard:** app health, runtime info, DI scope counts, top routes, aggregate security grade.
* **Architecture map:** read-only graph of controllers / use-cases / providers / middleware with DI scope badges and active-path highlighting; auto-generated from `AppContainer.introspect()`.
* **Request timeline + trace detail:** live recording of every HTTP request with OpenTelemetry spans, headers / body diff, and one-click Replay.
* **Live logs:** in-memory buffer of every framework + app log line, filterable by level, route, and context.
* **Error inspector:** aggregated runtime errors with stack frames and deep-links to source.
* **Security view:** `npm audit` + OSV.dev advisories with transitive root-cause chains, reachability scoring (`confirmed` / `likely` / `unreachable` / `unknown`), and one-click fixes. OWASP API Top 10 runtime posture findings derived from recorded traffic.
* **MCP server (in-repo, unpublished):** code-generation tools for CRUD / DTO / middleware / tests, grounded in ExpressoTS idioms.
* **Dynamic loading:** `adapter-express` only imports `@expressots/studio-agent` when `NODE_ENV=development` and the package is installed. Production deployments pay zero runtime cost.

### Architecture

* Studio UI to Studio agent over Socket.IO on the local machine (default port `3334`).
* Studio agent persists recordings in a local SQLite database (`.studio/`).
* MCP server is a separate stdio process; it does **not** require the agent or the UI to be running.
* Everything runs on the developer's machine. Nothing is sent off the box.

### Compatibility

* Requires `@expressots/core` ^4.0.0 and `@expressots/adapter-express` ^4.0.0.
* Node.js >= 20.19.0.

### Included since preview.3.4 (GA hardening)

* **Security hardening (`c7ceead`):** root `overrides` pin `js-yaml`, `hono`, `ws`, `esbuild`, `protobufjs`, `@opentelemetry/core`, and `vite` to patched versions; in-memory rate limiter in the Studio server; stricter path normalization and error handling in the route scanner, OpenAPI path utils, and security engine.
* Coverage detection and reporting features.
* `type: module` set for ES module support; tightened type definitions across packages.
* Removed unused dependencies: `serve-static` (studio), `socket.io-client` and three unused direct OpenTelemetry packages (studio-agent).
* Tests added for `mcp-server` (0 to 15) and the Studio server (23 to 32); root MIT `LICENSE` added.
* `engines.node >= 20.19.0` across all workspaces.

## Preview line (4.0.0-preview.3.x)

### 4.0.0-preview.3.4 (2026-06-13)

* New ArchitectureView with refactored ArchitectureMap layout logic and unit tests.
* Command Palette and Route Sidebar for faster navigation.
* Container Inspector: binding health checks and refresh.
* npm badge headers added to package READMEs.

### 4.0.0-preview.3.3 (2026-06-10)

* OpenAPI 3.1 spec generation, drift detection, and a Studio UI panel.
* Coverage reporting integrated into the UI.
* UI performance pass: lazy loading, new styles, component updates.

### 4.0.0-preview.3.1 / 4.0.0-preview.3.2 (2026-06-06)

* Request recording backed by SQLite.
* DatabaseView component in the Studio UI.
* ANSI escape codes stripped from captured log messages.
* IPC error handling during OpenTelemetry shutdown.
* `installId` and `mode` added to AgentConfig.
* Repo hygiene: commitlint + husky, issue templates, project sync workflow.

### 4.0.0-preview.3 (2026-05-25)

* Route scanner fix, global route prefix support, graceful shutdown, Studio SPA path handling.
* Security: vitest upgraded ^2 to ^4 and vite to ^6 across all workspace packages (esbuild moderate CVE).
* Major UI + agent overhaul: security view, architecture map, API client, StatusDashboard middleware cards.
