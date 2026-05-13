## [4.0.0](https://github.com/expressots/expressots-studio/releases/tag/4.0.0) (2026-05-12)

First public release of ExpressoTS Studio. Part of the ExpressoTS **v4.0.0 release bundle**. See the [v4.0.0 release notes](https://expresso-ts.com/docs/4.0.0/prologue/release) and the [Studio section of the docs](https://expresso-ts.com/docs/4.0.0/studio/overview).

Studio ships as three packages, all published at `4.0.0`:

| Package                       | Purpose                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `@expressots/studio`          | CLI + bundled web UI you run on your laptop. Boots the UI, probes the agent, opens the browser.        |
| `@expressots/studio-agent`    | Loaded into the app process — instrumentation middleware, SQLite recorder, log capture, DI snapshot, security engine, Socket.IO server. Optional peer dependency of `@expressots/adapter-express`. |
| `@expressots/mcp-server`      | Stdio MCP server consumed by Claude Desktop, Cursor, and other AI editors. Runs as a separate process. |

### Features

* **Status dashboard:** app health, runtime info, DI scope counts, top routes, aggregate security grade.
* **Architecture map:** read-only graph of controllers / use-cases / providers / middleware with DI scope badges and active-path highlighting; auto-generated from `AppContainer.introspect()`.
* **Request timeline + trace detail:** live recording of every HTTP request with OpenTelemetry spans, headers / body diff, and one-click Replay.
* **Live logs:** in-memory buffer of every framework + app log line, filterable by level, route, and context.
* **Error inspector:** aggregated runtime errors with stack frames and deep-links to source.
* **Security view:** `npm audit` + OSV.dev advisories with transitive root-cause chains, reachability scoring (`confirmed` / `likely` / `unreachable` / `unknown`), and one-click fixes. OWASP API Top 10 runtime posture findings derived from recorded traffic.
* **MCP server:** code-generation tools for CRUD / DTO / middleware / tests, grounded in ExpressoTS idioms; consumed by Claude Desktop, Cursor, Continue, and other MCP-aware editors.
* **Dynamic loading:** `adapter-express` only imports `@expressots/studio-agent` when `NODE_ENV=development` and the package is installed. Production deployments pay zero runtime cost.

### Architecture

* Studio UI ↔ Studio agent over Socket.IO on the local machine (default port `3334`).
* Studio agent persists recordings in a local SQLite database (`.studio/`).
* MCP server is a separate stdio process; it does **not** require the agent or the UI to be running.
* Everything runs on the developer's machine. Nothing is sent off the box.

### Compatibility

* Requires `@expressots/core` ^4.0.0 and `@expressots/adapter-express` ^4.0.0.
* Node.js ≥ 20.0.0.
