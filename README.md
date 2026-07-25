<p align="center">
  <a href="https://expresso-ts.com/" target="blank"><img src="packages/core/media/expressots.png" width="120" alt="ExpressoTS Logo" /></a>
</p>

<p align="center">
  ExpressoTS — a modern, fast, lightweight Node.js web framework for building scalable server-side applications with TypeScript.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@expressots/core"><img src="https://img.shields.io/npm/v/@expressots/core.svg" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@expressots/core"><img src="https://img.shields.io/npm/dm/@expressots/core.svg" alt="npm downloads" /></a>
  <a href="LICENSE.md"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license" /></a>
</p>

# ExpressoTS Monorepo

This repository hosts the entire ExpressoTS framework: core, CLI, adapters, shared libraries, Studio, official templates, and examples.

📖 **Documentation:** [doc.expresso-ts.com](https://doc.expresso-ts.com) · **Website:** [expresso-ts.com](https://expresso-ts.com)

## Packages

| Package | npm | Description |
| ------- | --- | ----------- |
| [`packages/core`](packages/core) | [@expressots/core](https://www.npmjs.com/package/@expressots/core) | Framework core: DI container, providers, application lifecycle |
| [`packages/adapter-express`](packages/adapter-express) | [@expressots/adapter-express](https://www.npmjs.com/package/@expressots/adapter-express) | Express.js adapter |
| [`packages/cli`](packages/cli) | [@expressots/cli](https://www.npmjs.com/package/@expressots/cli) | CLI for scaffolding and managing projects (`expressots` / `ex`) |
| [`packages/shared`](packages/shared) | [@expressots/shared](https://www.npmjs.com/package/@expressots/shared) | Shared internals used across packages |
| [`packages/boost-ts`](packages/boost-ts) | [@expressots/boost-ts](https://www.npmjs.com/package/@expressots/boost-ts) | Standalone TypeScript utility libraries (pattern matching, text utils) |
| [`apps/studio`](apps/studio) | [@expressots/studio](https://www.npmjs.com/package/@expressots/studio) | ExpressoTS Studio — developer experience platform |
| [`apps/studio-agent`](apps/studio-agent) | [@expressots/studio-agent](https://www.npmjs.com/package/@expressots/studio-agent) | Studio runtime agent |
| [`apps/mcp-server`](apps/mcp-server) | — (private) | MCP server for AI-assisted development |
| [`templates`](templates) | — | Official project templates used by the CLI |
| [`examples`](examples) | — | Runnable example applications |

## Quickstart (users)

```bash
npm i -g @expressots/cli
ex new my-app
```

## Contributing (developers)

Requirements: Node.js >= 20.19 and [pnpm](https://pnpm.io).

```bash
git clone https://github.com/expressots/expressots.git
cd expressots
pnpm install
pnpm build
pnpm test
```

Common tasks are orchestrated with [Turborepo](https://turbo.build) from the repo root:

| Command | What it does |
| ------- | ------------ |
| `pnpm build` | Build all packages in dependency order |
| `pnpm test` | Run every package's test suite |
| `pnpm lint` | Lint all packages |
| `pnpm changeset` | Record a change for the next release ([Changesets](https://github.com/changesets/changesets)) |

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE.md)
