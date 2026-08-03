# @expressots/cli

## 4.2.0

### Minor Changes

- f4906bb: Add Cloudflare Workers as a scaffold target for ExpressoTS micro projects,
  including Wrangler configuration, runtime-aware documentation, and Worker
  handler tests. The target is selectable both with `--target cloudflare` and
  from the interactive `expressots new` wizard when the micro template is
  chosen.

    Harden Cloudflare request-body handling and keep path-alias registration
    compatible with bundled ESM output.

    Cloudflare adapter request bodies are now parsed according to their content
    type. JSON and URL-encoded bodies remain structured values, while text and
    requests without a content type are passed to handlers as strings.

    Partially addresses #945. Thanks @xgame92 for the contribution.

- d9e96bb: Request fidelity on Cloudflare Workers, and Worker tests that run on workerd.

    **Binary and multipart bodies survive intact (#949).** The adapter read every
    body with `request.text()`, UTF-8 decoding arbitrary bytes — any invalid
    sequence became `U+FFFD` and the original was unrecoverable, silently. File
    uploads were impossible. Bodies are now read as bytes and only decoded when the
    content type is textual; anything else reaches `req.body` as a `Buffer`.
    `multipart/form-data` is parsed with the runtime's native `FormData`, with file
    parts exposed as `{ filename, contentType, size, data }`.

    **Duplicate and bracketed keys match Node (#949).** Query strings and
    urlencoded bodies now go through `qs`, the parser
    `express.urlencoded({ extended: true })` uses. Previously `?tag=a&tag=b` gave
    `{ tag: "b" }` on Workers and `{ tag: ["a","b"] }` on Node, so the same handler
    returned different data depending on where it was deployed. `qs` is already in
    the Worker bundle via Express, so this costs no bundle size.

    **Request bodies are capped (#949).** Bodies over 1 MiB are rejected with
    **413**, checked against `content-length` before reading. A Workers isolate has
    128 MB of memory and Cloudflare accepts bodies up to 100 MB, so an unbounded
    read was an availability hazard. Configure with
    `cloudflareAdapter(app, { maxBodySize })`; `0` disables it.

    **Cloudflare scaffolds test on workerd, not Node (#952).** The target now
    generates Vitest with `@cloudflare/vitest-pool-workers` instead of Jest, plus a
    `vitest.config.mts` pointed at `wrangler.toml`, and specs that drive the Worker
    through `SELF.fetch()`. Node-hosted tests were wrong in both directions:
    `undici` omits `content-length`, so Express body middleware short-circuited and
    a Worker that failed every request in production tested green; and `undici`
    rejects a 204 response body that workerd accepts, so a correct endpoint failed
    its own suite. The generated `tsconfig.json` moves to
    `module: esnext` / `moduleResolution: bundler`, which a Workers project wants
    anyway and which Node10 resolution could not provide.

    **CLI: `expressots new` no longer crashes in a narrow terminal (#955).**
    `centerText` passed a negative count to `" ".repeat()`, throwing a `RangeError`
    _after_ the scaffold had completed and reported success — leaving a working
    project alongside a stack trace and a non-zero exit code.

    **Build: `turbo run build test` no longer races (#956).** The `test` task
    declared only `^build` (upstream packages), so `@expressots/cli`'s tests could
    spawn `bin/cli.js` while its own build was deleting that directory.

- Cloudflare workers + small fixes on adapter

### Patch Changes

- 471b754: Bump `degit` from 2.8.4 to 2.8.6, resolving GHSA-77c7-pq4r-6mcq / CVE-2026-11572
  (command injection via unsanitised `child_process.exec` in `_cloneWithGit()` and
  `fetchRefs()`). 2.8.6 switches those call sites to `execFile`, removing the shell.

    The CLI's own usage was not exploitable: both `degit()` call sites hardcode the
    `expressots/templates` repository, so the only value reaching an exec sink
    (`repo.url`) was never user-controlled, and the user-supplied
    `EXPRESSOTS_TEMPLATE_REF` ref is only ever compared in JS, never interpolated
    into a command. This bump clears the advisory for downstream scanners.

- 1dab8bc: Serverless adapters: response fidelity, working lifecycle hooks, and a loud
  guard for body-parsing middleware.

    **Adapters accept a `MicroApp` directly.** `cloudflareAdapter(app)`,
    `vercelAdapter(app)` and `awsLambdaAdapter(app)` now unwrap `getApp()` as well
    as `getExpressApp()`. Passing a `MicroApp` previously handed Express an object
    that was not an Express app, failing deep inside the router rather than at the
    call site. `app.getApp()` keeps working.

    **Response fidelity (#948).**

    - Multiple `Set-Cookie` headers no longer collapse into one comma-joined value,
      which broke every cookie-based session. Cloudflare emits them via
      `Headers.append()`; Lambda emits them in `multiValueHeaders`.
    - `res.statusCode = 201` is honoured on Cloudflare. It was tracked in a closure
      only `res.status()` wrote to, so direct assignment — ordinary Express, and
      what several third-party middlewares do internally — was silently dropped.
    - 204/205/304 responses carry no body. Passing an empty Buffer is tolerated by
      workerd but throws under Node/undici, so a 204 endpoint passed in production
      and failed in its own Jest suite.

    **`setErrorHandler` and the RFC-7807 404 work on serverless targets (#950).**
    Both were installed inside `listen()`, which serverless adapters never call, so
    `setErrorHandler` type-checked and did nothing. `micro()` now finalizes its
    middleware stack on the first request, so hosting makes no difference.
    Registration is idempotent, and the handler is resolved at request time so
    `setErrorHandler` still takes effect if called late.

    **Body-parsing middleware fails loudly instead of at runtime (#951).**
    `micro()`'s auto-parsers stand down when a Cloudflare or Lambda adapter is
    attached, so the default `micro()` config now works on Workers without
    `autoParseJson: false`. Explicitly registering `express.json()`,
    `express.urlencoded()`, `express.text()`, `express.raw()`, `multer()` or
    `compression()` on those targets throws a named error at adapter construction —
    which in a Worker is module scope, so it surfaces at `wrangler dev` startup
    rather than as a 500 on every request.

    `vercelAdapter` is deliberately exempt from that guard: Vercel supplies a real
    Node request/response pair, so body parsers work there normally. Its error
    responses no longer leak `err.message` to the client, matching the other
    adapters.

    The Cloudflare scaffold drops the now-unnecessary `autoParseJson: false` line,
    and its README and `AGENTS.md` describe the constraint rather than the
    workaround.

- Updated dependencies
    - @expressots/shared@4.2.0

## 4.1.1

### Patch Changes

- Readme tags update
- Updated dependencies
    - @expressots/shared@4.1.1

## 4.1.0

### Minor Changes

- Project monorepo & small fixes

### Patch Changes

- Updated dependencies
    - @expressots/shared@4.1.0

## [4.0.0](https://github.com/expressots/expressots-cli/compare/4.0.0-preview.3.4...v4.0.0) (2026-07-16)

Stable release. `expressots new` now resolves templates from the `expressots/templates#v4.0.0` tag.

### Breaking Changes

- **engines:** minimum Node.js is now 20.19.0.

### Bug Fixes

- **tests:** the degit invocation test now derives the expected ref from the real package version and exercises the actual template-ref resolution, including the `EXPRESSOTS_TEMPLATE_REF` override.
- **tests:** pricing-manager tests are isolated from the real `~/.expressots` disk cache.

### Build System

- `strictNullChecks` enabled and all resulting errors fixed.
- removed unused dependencies (`semver`, `shx`, `reflect-metadata`, `@codecov/vite-plugin`) and the decorator tsconfig flags (the CLI has no decorators).
- TypeScript 7-clean config: `module`/`moduleResolution` `node16` with explicit `rootDir`. Toolchain remains TypeScript 5.x.
- published manifest is stripped of dev-only fields by `release:prepare`.

### Code Refactoring

- deleted the dead `src/index.ts` library facade and the placeholder test; renamed `nonopininated-cmd.ts` to `nonopinionated-cmd.ts`.

## [4.0.0-preview.3.4](https://github.com/expressots/expressots-cli/compare/4.0.0-preview.3.3...4.0.0-preview.3.4) (2026-06-13)

### Features

- **dev:** improved file watching and environment handling for `expressots dev` ([9caaac3](https://github.com/expressots/expressots-cli/commit/9caaac3))

### Bug Fixes

- **new:** scaffold the pnpm `allowBuilds` config only when pnpm is the selected package manager ([98239b8](https://github.com/expressots/expressots-cli/commit/98239b8))

### Code Refactoring

- **cli:** removed the Node.js version check from project creation; the `engines` field is the single source of truth ([612d684](https://github.com/expressots/expressots-cli/commit/612d684))

### Build System

- declared `files` in package.json so published artifacts contain only README, LICENSE, CHANGELOG, and the `bin` output ([a0de8cd](https://github.com/expressots/expressots-cli/commit/a0de8cd))

## [4.0.0-preview.3.3](https://github.com/expressots/expressots-cli/compare/4.0.0-preview.3.2...4.0.0-preview.3.3) (2026-06-10)

### Features

- **openapi:** new `expressots openapi emit` command for generating OpenAPI specs ([3a22c20](https://github.com/expressots/expressots-cli/commit/3a22c20))

## [4.0.0-preview.3.2](https://github.com/expressots/expressots-cli/compare/4.0.0-preview.3.1...4.0.0-preview.3.2) (2026-06-06)

- Republish of 4.0.0-preview.3.1 with no code changes.

## [4.0.0-preview.3.1](https://github.com/expressots/expressots-cli/compare/4.0.0-preview.3...4.0.0-preview.3.1) (2026-06-06)

### Features

- **cli:** structured, grouped help screens for top-level and per-command help, with detailed choices and descriptions ([e1e4507](https://github.com/expressots/expressots-cli/commit/e1e4507), [21f59b4](https://github.com/expressots/expressots-cli/commit/21f59b4))
- **dev/build/prod:** graceful shutdown process management; the parent process now waits for all child processes to exit ([bf8b647](https://github.com/expressots/expressots-cli/commit/bf8b647))
- **cicd:** package-manager-aware command generation (npm, yarn, pnpm, bun) across all supported CI/CD platforms, with improved lockfile handling ([7e6b4ec](https://github.com/expressots/expressots-cli/commit/7e6b4ec))

### Bug Fixes

- **new:** middleware preset placeholder and preset files are applied before `npm install`, so a failed install still leaves a runnable scaffold ([ba03a33](https://github.com/expressots/expressots-cli/commit/ba03a33))
- **security:** upgraded release-it 17 to 20, @release-it/conventional-changelog 8 to 11, and inquirer 8.2.6 to 8.2.7 ([f96f02c](https://github.com/expressots/expressots-cli/commit/f96f02c))
- **cli:** deterministic help output in tests via `NO_COLOR` ([4c99278](https://github.com/expressots/expressots-cli/commit/4c99278))

### Code Refactoring

- **containerize:** structured output, warnings, and clearer error messages during containerization ([3820955](https://github.com/expressots/expressots-cli/commit/3820955))
- **info:** async `infoForm` with more detailed OS information ([4ceec78](https://github.com/expressots/expressots-cli/commit/4ceec78))

### Continuous Integrations

- issue template refresh and Expressots Project sync workflow ([9958a2e](https://github.com/expressots/expressots-cli/commit/9958a2e))
- lint-staged plus husky hooks for pre-commit lint and format ([e2e8953](https://github.com/expressots/expressots-cli/commit/e2e8953), [b118edf](https://github.com/expressots/expressots-cli/commit/b118edf))

## [4.0.0-preview.3](https://github.com/expressots/expressots-cli/compare/3.0.0...4.0.0-preview.3) (2026-05-25)

Part of the ExpressoTS **v4.0.0 preview bundle**. See the [v4.0.0 release notes](https://expresso-ts.com/docs/4.0.0/prologue/release) and the [CLI reference](https://expresso-ts.com/docs/4.0.0/cli/overview) for the full picture.

### Features

- **new templates + presets:** `expressots new` accepts `--template application | micro` and `--preset api | web | graphql | microservice | minimal`. The `application` and `micro` templates have been modernised end-to-end.
- **v4 schematic set:** `generate` now scaffolds `controller`, `usecase`, `dto`, `module`, `provider`, `entity`, `middleware`, `interceptor`, `event`, `handler`, `guard`, `config`. Supports folder/subfolder/resource paths, shorthand, trailing-slash semantics, and the `opinionated` vs. non-opinionated layout switch.
- **provider management:** `expressots add`, `remove`, `create` with lockfile-aware package-manager detection (npm, yarn, pnpm).
- **scripts runner:** `expressots scripts` for interactive (and direct) script execution with package-manager detection.
- **studio integration:** `expressots studio` auto-installs `@expressots/studio` on first use, launches the UI, opens the browser, and probes the studio-agent.
- **containerize:** `expressots containerize` for Docker / Compose / Kubernetes outputs with presets, project analyser, and `--include-ci`.
- **profile:** `expressots profile` with `container` / `image` / `optimize` / `report` actions; Trivy integration for image security scans.
- **cicd:** `expressots cicd` with `init` / `generate` / `list` / `validate` actions targeting GitHub Actions, GitLab CI, CircleCI, Jenkins, Bitbucket, Azure DevOps; `basic` / `comprehensive` / `security-focused` strategies.
- **migrate:** `expressots migrate` with `init` / `generate` / `list` / `analyze` actions and supported paths Heroku → Railway, Docker Compose → Kubernetes (more on the roadmap).
- **costs:** `expressots costs` with `estimate` / `compare` / `optimize` / `pricing` / `update` / `info` actions for cloud cost forecasting.
- **container-dev:** `expressots container-dev` (`start` / `stop` / `attach` / `shell` / `status` / `logs`) for a docker-compose-based development workflow.
- **info + resources:** `expressots info` (project, OS, Node, CLI versions) and `expressots resources` (cheat sheet for every command + schematic).
- **dev / build / prod:** `dev` runs `tsx --watch`, `build` rewrites path aliases during emit, `prod` runs the built output via plain `node`.

### Bug Fixes

- `expressots new` no longer ships `nodemon` in template devDependencies (v4 uses `tsx --watch`).
- `expressots scripts` correctly detects bun's absence and falls back to npm / yarn / pnpm based on the lockfile.
- `BUNDLE_VERSION` is now derived from the CLI's own `package.json` (was hardcoded). `expressots --version` and `expressots info` now always match the published artifact.
- `expressots new` and `expressots create` now degit a templates tag matching the CLI version (`v${BUNDLE_VERSION}`) rather than the moving `feature/v4.0` branch / a stale `v4.0.0-preview.1` tag. CLI releases and template tags now move together.
- `expressots new` and `expressots create` now print the _actual_ underlying error (e.g. `MISSING_REF`, `EACCES`, `DEST_NOT_EMPTY`) instead of the historical catch-all `"Project already exists or Folder is not empty"`. The "folder not empty" message is still emitted, but only when that's truly the cause.
- During the preview window — when the matching `vX.Y.Z` templates tag has not yet been pushed to GitHub — `expressots new` / `expressots create` automatically fall back to the `feature/v4.0` branch and warn, rather than failing opaquely. The fallback is gated to preview/alpha/beta/rc CLI builds.
- New `EXPRESSOTS_TEMPLATE_REF=<branch-or-tag>` environment variable lets users override the templates ref for either command (e.g. for testing a forked or in-flight template revision).
- `chalk` moved from `devDependencies` to `dependencies` — fixes `Cannot find module 'chalk'` on a fresh `npm install -g @expressots/cli`.
- `@expressots/shared` moved from `devDependencies` to `dependencies` for the same reason.

### Build System

- `expressots-cli` now requires Node.js 20.19.0+.
- `release-it` upgraded to 17.6.0 with `@release-it/conventional-changelog@8.0.1`; commit message normalised to `chore(release): ${version}` for consistency with the rest of the framework.

## [3.0.0](https://github.com/expressots/expressots-cli/compare/3.0.0-beta.3...3.0.0) (2024-12-04)

### Bug Fixes

- remove publish script from package.json ([d5bf2e5](https://github.com/expressots/expressots-cli/commit/d5bf2e58a06ba39a5a84272ff33b08e976ed2c28))
- update commit message format in release-it configuration ([757b76a](https://github.com/expressots/expressots-cli/commit/757b76a5775a94ea607004b94862e216a4c1afd2))
- update package version to 3.0.0 and adjust BUNDLE_VERSION in CLI ([23ef462](https://github.com/expressots/expressots-cli/commit/23ef462d6c7b108bab74529befa22d592493b1ad))
- update package versions and improve error handling in CLI commands ([cb94a4a](https://github.com/expressots/expressots-cli/commit/cb94a4a8f75132380b6ed450a95dd0ad7d56a20a))

## [3.0.0-beta.4](https://github.com/expressots/expressots-cli/compare/3.0.0-beta.3...3.0.0) (2024-12-03)

### Bug Fixes

- remove publish script from package.json ([d5bf2e5](https://github.com/expressots/expressots-cli/commit/d5bf2e58a06ba39a5a84272ff33b08e976ed2c28))
- update package versions and improve error handling in CLI commands ([cb94a4a](https://github.com/expressots/expressots-cli/commit/cb94a4a8f75132380b6ed450a95dd0ad7d56a20a))

## [3.0.0-beta.3](https://github.com/expressots/expressots-cli/compare/3.0.0-beta.2...3.0.0) (2024-11-28)

### Bug Fixes

- remove unnecessary blank line in project form function ([0388598](https://github.com/expressots/expressots-cli/commit/0388598c7330509d824e7c8be3cbb1bf63279976))
- update coverage collection pattern in Jest configuration ([4e658cc](https://github.com/expressots/expressots-cli/commit/4e658ccd36f3dfcec0d9089515d57d883207d4c9))

### Code Refactoring

- clean up VSCode settings fix template option for non-op ([054afe1](https://github.com/expressots/expressots-cli/commit/054afe1efca226b5e85559ee5e5b2e1d34dc3776))
- reorganize imports and simplify package manager install arguments ([4a7d259](https://github.com/expressots/expressots-cli/commit/4a7d259ab0da48701782ea88af4ce9f7b2bb4c23))

## [3.0.0-beta.2](https://github.com/expressots/expressots-cli/compare/3.0.0-beta.1...3.0.0) (2024-11-24)

### Features

- update project templates and improve configuration loading for CLI commands ([3553639](https://github.com/expressots/expressots-cli/commit/3553639f2a507c9423985ca7177246324bebdecd))

## [3.0.0-beta.1](https://github.com/expressots/expressots-cli/compare/1.12.0...3.0.0) (2024-11-19)

### Features

- add alias for CLI command and improve module import syntax ([95fd9e6](https://github.com/expressots/expressots-cli/commit/95fd9e64dcd0141a3dcd519d0c7138e624a14858))
- add env configuration from shared ([880d405](https://github.com/expressots/expressots-cli/commit/880d40537fe5e5459023a3bf0faf41a2568ae494))
- add remove provider command and enhance add provider functionality ([9a29024](https://github.com/expressots/expressots-cli/commit/9a2902456b1fc7c795ccec60420767bccbfd637e))
- add shared lib as deps & remove config ([185efad](https://github.com/expressots/expressots-cli/commit/185efadd86279c21ccb74a6ae4afa59f9d2e7dad))
- add test dir ESLint & update Jest config for improved testing structure ([fc3f48d](https://github.com/expressots/expressots-cli/commit/fc3f48df45d4e16fa86512adb1a107833950d8a0))
- enhance pm install proc with improved command handling and progress feedback ([2447b21](https://github.com/expressots/expressots-cli/commit/2447b21354d680c19bc59de33c820ad8cd061737))
- migrate from Vitest to Jest for testing framework ([124a4ec](https://github.com/expressots/expressots-cli/commit/124a4ecaa58279eb8f31b8dc934127615d6064a7))
- refactor string case utilities and update dependencies ([aec5d24](https://github.com/expressots/expressots-cli/commit/aec5d24b2b01cea9fa8e764bfd18ea82a4ab9ecb))
- update package dependencies and enhance CLI command handling ([8fe9df5](https://github.com/expressots/expressots-cli/commit/8fe9df5ff38e4683f2cb314df0ae9e2d1133e74a))
- update scripts for build process and enhance package.json configurations ([e759366](https://github.com/expressots/expressots-cli/commit/e7593662d3803afc877c00b25dc9e19d8f6f1327))

### Bug Fixes

- add newline at end of file in infoForm function ([7255a69](https://github.com/expressots/expressots-cli/commit/7255a6958bd2366f299c9e9d384bc9d6bed51391))
- improve readability of package manager install command logic ([6461e50](https://github.com/expressots/expressots-cli/commit/6461e506c2dc3cc26657edd08f1bf2bb3a737ba2))
- restore shared dependency in package.json ([c395d05](https://github.com/expressots/expressots-cli/commit/c395d05a843b9a2a4efd43097b4b75d94a34918a))
- standardize string utility function formatting and improve readability ([a95accc](https://github.com/expressots/expressots-cli/commit/a95accc0deed1db83803b427c344d611fed9657b))
- update development command to use tsx and adjust template copy path ([97c7ee4](https://github.com/expressots/expressots-cli/commit/97c7ee4b1af90d65332372a34f7feac7fb00466a))
- update module declaration syntax in add-module-to-container utility ([4f5c54d](https://github.com/expressots/expressots-cli/commit/4f5c54dac3d6b4717820e2b8349e52abe47da931))
- upgrade semver from 7.6.2 to 7.6.3 ([da99c6a](https://github.com/expressots/expressots-cli/commit/da99c6af3473f476a80b40a06123c0acc9bf6a12))

### Code Refactoring

- remove BaseController inheritance and adjusting method signatures ([6d99bc3](https://github.com/expressots/expressots-cli/commit/6d99bc34adaf54c7e152cc34601c3db4e2480928))
- streamline package manager install command arguments and improve logic ([88e7b7c](https://github.com/expressots/expressots-cli/commit/88e7b7cde0d95f97dedc48ccff10966fb3b70d7c))
- update app container file references and improve module extraction logic ([dbb4840](https://github.com/expressots/expressots-cli/commit/dbb484099b90c435d79607bf7e5541e3446e7ffd))

## [1.12.0](https://github.com/expressots/expressots-cli/compare/1.11.1...1.12.0) (2024-08-08)

### Features

- add the script command ([158cf6e](https://github.com/expressots/expressots-cli/commit/158cf6efad1e3b262d941c802fb37893c6075849))

### Bug Fixes

- adjusts in the print warning and error msgs ([d17e583](https://github.com/expressots/expressots-cli/commit/d17e5837ce82f899bcd4a6655796527e60219f09))

## [1.11.1](https://github.com/expressots/expressots-cli/compare/1.11.0...1.11.1) (2024-08-04)

### Bug Fixes

- broken tsconfig deps ([d4fbc8b](https://github.com/expressots/expressots-cli/commit/d4fbc8b3cfce99fc084f27b2f365758302526720))

## [1.11.0](https://github.com/expressots/expressots-cli/compare/1.10.0...1.11.0) (2024-08-04)

### Features

- add command validation and better error message ([f70cf27](https://github.com/expressots/expressots-cli/commit/f70cf27c3bbfa53234c95d21a55a11c50aace7f2))

### Bug Fixes

- user outDir in tsconfig build can be changed to any name ([4abb6ab](https://github.com/expressots/expressots-cli/commit/4abb6ab19aaf284e7f976e64a2205e6217144d6c))
- validate outDir absence in build json ([1907684](https://github.com/expressots/expressots-cli/commit/1907684fee64b5c54556f2570049f5299e9a6e12))

### Code Refactoring

- remove prisma provider ([ea7af9c](https://github.com/expressots/expressots-cli/commit/ea7af9c552c7bd69548b066fc4bd7bd0e06337f0))

## [1.10.0](https://github.com/expressots/expressots-cli/compare/1.9.0...1.10.0) (2024-08-03)

### Features

- adjust ui and add dev, build, prod as individual cmd ([f505478](https://github.com/expressots/expressots-cli/commit/f50547898976030fd1979f12eedc148f8d2dff47))
- provider add(existing) and create(external) options ([afe9fa2](https://github.com/expressots/expressots-cli/commit/afe9fa20885c809ddbce69835f30be16e8c60096))

### Bug Fixes

- use stdout.write for optimal performance main menu ([9279fbf](https://github.com/expressots/expressots-cli/commit/9279fbf9feb1ec8fe2dbe4cf90e738f42ac82040))

### Code Refactoring

- snyk glob security update ([7e465b4](https://github.com/expressots/expressots-cli/commit/7e465b4169f53bcdf0f00332653428c4cdda7b1f))
- update ui command text ([5e76626](https://github.com/expressots/expressots-cli/commit/5e766263976917ab2707075090956454180c39fb))

## [1.9.0](https://github.com/expressots/expressots-cli/compare/1.8.2...1.9.0) (2024-08-01)

### Features

- improve package install performance ([b7ac564](https://github.com/expressots/expressots-cli/commit/b7ac564d4fc8adf54134c87d2f6e566e21790dae))

### Bug Fixes

- update nodejs latest version ([565a069](https://github.com/expressots/expressots-cli/commit/565a069aea5934c8b5aacce18c1a12e8bb60987b))
- update usecase to UseCase nonop template ([e690cda](https://github.com/expressots/expressots-cli/commit/e690cda45912ae1bfcb7b4b2144ef964ade89a05))
- upgrade cli-progress from 3.11.2 to 3.12.0 ([f637b88](https://github.com/expressots/expressots-cli/commit/f637b88c8e12e5e8a8dffe37ddb5d83e05650cbf))
- upgrade inquirer from 8.0.0 to 8.2.6 ([5e51ec5](https://github.com/expressots/expressots-cli/commit/5e51ec57be9313aea87e8ce6942749daba572c2d))
- upgrade yargs from 17.6.2 to 17.7.2 ([61f343f](https://github.com/expressots/expressots-cli/commit/61f343f8e3596a2373502c4729bb5a97479d23d3))

### Code Refactoring

- **createProject:** add types and remove useless projectForm args iteration ([0a8d7eb](https://github.com/expressots/expressots-cli/commit/0a8d7eb5ac211e18a08f3442fee8a7b8551e3584))
- update 'new' cmd removing unnecessary options ([6d1da80](https://github.com/expressots/expressots-cli/commit/6d1da808a5a1e98266ee83f05c1b08b3c9404952))
- update boost-ts deps ([8deb32e](https://github.com/expressots/expressots-cli/commit/8deb32ea3abee378493bfc962c5bff8446b16763))
- update cli-table3 and remove ts-node ([4bfa3bc](https://github.com/expressots/expressots-cli/commit/4bfa3bc3ff1a670e06dc95eb552978925fb4d597))

## [1.8.2](https://github.com/expressots/expressots-cli/compare/1.8.1...1.8.2) (2024-07-04)

### Code Refactoring

- remove inversify binding decorators [@provide](https://github.com/provide) ([a566490](https://github.com/expressots/expressots-cli/commit/a566490edcc2c3d1249470dd879a4884ba4b9c63))

## [1.8.1](https://github.com/expressots/expressots-cli/compare/1.8.0...1.8.1) (2024-06-12)

### Bug Fixes

- add node version restriction ([9cf3416](https://github.com/expressots/expressots-cli/commit/9cf3416a8379d35487f9224751c84c2cab8b8ae4))
- adjust engine version ([5834ab5](https://github.com/expressots/expressots-cli/commit/5834ab5c099305f436bd196a3c1967fc6bef9826))
- remove test lib cli ([1d1772b](https://github.com/expressots/expressots-cli/commit/1d1772bf9fb888e7d87875280a71bc0bfdb8b82a))
- update codecov plugin version ([a1f6ded](https://github.com/expressots/expressots-cli/commit/a1f6ded7161744be8459d7ad0e842a1b17657c6e))
- update engine on ci/cd ([8ebc317](https://github.com/expressots/expressots-cli/commit/8ebc31724bd487d1aaa148385056ba438bd63fda))

## [1.8.0](https://github.com/expressots/expressots-cli/compare/1.7.1...1.8.0) (2024-04-29)

### Features

- add code coverage ([034f078](https://github.com/expressots/expressots-cli/commit/034f078c4bc6d33193600e176f6ca25bc6b175f6))
- add external provider scaffold ([8ed033b](https://github.com/expressots/expressots-cli/commit/8ed033b3a3d64febd03b93fbca1cd571d6a46d39))
- add vitest configuration ([c1e4521](https://github.com/expressots/expressots-cli/commit/c1e45217bd098fe70fe6545997bdc18af46648e8))
- rename .env.example to .env during project creation ([94bc93d](https://github.com/expressots/expressots-cli/commit/94bc93d450887e4e3cee35b22a17b2229e26c3a2))
- update readme shields ([241b83b](https://github.com/expressots/expressots-cli/commit/241b83bc4191d8f9b8837d4a2d8ef9ccb58c7f77))

### Bug Fixes

- add coverage folder to eslint ignore pattern ([61c4df1](https://github.com/expressots/expressots-cli/commit/61c4df1cc23e4a6266c47c8c1ed1be7f06f1cdd2))
- add coverage to gitignore ([53b9cfd](https://github.com/expressots/expressots-cli/commit/53b9cfd384623e078e5fee91710514f9a3bd4b56))
- adjust package version dependencies ([067170b](https://github.com/expressots/expressots-cli/commit/067170bf2a01fb449624979b89366f2d6a0902ec))
- adjust sheild for npm & build ([416595f](https://github.com/expressots/expressots-cli/commit/416595ffe7be630d058444d994abd617b49d0db2))
- npm package installation progress message ([93f9c83](https://github.com/expressots/expressots-cli/commit/93f9c8394a65f2008c408f1fa9fd5e163100951a))
- remove codesee workflow ([afc492b](https://github.com/expressots/expressots-cli/commit/afc492b735d819a1e58c32c8f6bb78055c73532a))

### Code Refactoring

- update index help and await print ([17dda21](https://github.com/expressots/expressots-cli/commit/17dda210e7643f95a9e0903d2ae584080dd6de1b))

### Continuous Integrations

- update package dependencies, lint issues ([54f81b7](https://github.com/expressots/expressots-cli/commit/54f81b752cc5c1a22d2f1386bf9ffc78d9608902))
- update pull request workflow ([9695b00](https://github.com/expressots/expressots-cli/commit/9695b00ddb798a2cc574ded560789e1703e8a582))

## [1.7.1](https://github.com/expressots/expressots-cli/compare/1.7.0...1.7.1) (2024-04-11)

### Bug Fixes

- update nonop controller and usecase template ([1a84a3a](https://github.com/expressots/expressots-cli/commit/1a84a3a3c52df1a67077f7380a3b7c19c7ad26c9))

## [1.7.0](https://github.com/expressots/expressots-cli/compare/1.6.0...1.7.0) (2024-03-29)

### Features

- add expressotsconfig scaffoldName schematics changeable by user ([964804f](https://github.com/expressots/expressots-cli/commit/964804f05d2d234f2ab87cf02ac158a583d2d102))
- add Nested path validation ([0a105bb](https://github.com/expressots/expressots-cli/commit/0a105bb6abacc2a9b62f948df304ab34f5fb7f19))
- add path command style to opinionated services ([3dea624](https://github.com/expressots/expressots-cli/commit/3dea624160a689ee82e75d4171752c98d5506b16))
- add single and sugar path validation ([b5738e5](https://github.com/expressots/expressots-cli/commit/b5738e50cfc6d26a068bffa2dd7e9e342e4f0c76))
- fixed nested resource gen e add fn comments ([3a2c26c](https://github.com/expressots/expressots-cli/commit/3a2c26ce46b3491db41b327ba3377e422e3fd91b))
- resource list panel ([249cc73](https://github.com/expressots/expressots-cli/commit/249cc73fd5251274e2742aada1a68b4c457c4f8e))

### Bug Fixes

- adjust linter ([8ef1714](https://github.com/expressots/expressots-cli/commit/8ef1714ed6f03a5b7d7ebd960597069ab8fa05ab))

### Code Refactoring

- add controller service to module ([1b7b94a](https://github.com/expressots/expressots-cli/commit/1b7b94a04671b3c0c06ca42d3015cf00ce00da60))
- add generate module service scaffold ([f634c13](https://github.com/expressots/expressots-cli/commit/f634c132d7d2fe4ded5116ce594b75980eb320e6))
- add module to container ([c2768fb](https://github.com/expressots/expressots-cli/commit/c2768fb652c901080602650c45ebd662f17f8d2e))
- adjust form console msg on error in existing project ([44f17f1](https://github.com/expressots/expressots-cli/commit/44f17f1d053adead04ba607920499b1b5408af5b))
- adjust opinionated path module insertion ([e9b3822](https://github.com/expressots/expressots-cli/commit/e9b382235f90f118786b2a9e270a229015cf1297))
- adjust templates ([fda129f](https://github.com/expressots/expressots-cli/commit/fda129f3c931711859eae12ec245653c09f37af7))
- create nonop & op command file ([0c63f67](https://github.com/expressots/expressots-cli/commit/0c63f67a7e3da729dc6cceff40a89f6aa3adb7cf))
- redo all nonop generator resources ([249c1bd](https://github.com/expressots/expressots-cli/commit/249c1bdde2ad9187f05f85e43f25bd1b92f3c162))
- remove the cli version from info cmd ([4056a5e](https://github.com/expressots/expressots-cli/commit/4056a5e0d2e85a43ff44ce8da571c0af1acd0785))
- restructure all generate scaffold methods ([cdddaa1](https://github.com/expressots/expressots-cli/commit/cdddaa1a29466d93369d1052ae9db65e0dc8b4c8))

## [1.6.0](https://github.com/expressots/expressots-cli/compare/1.5.0...1.6.0) (2024-03-22)

### Features

- add expressots custom project command ([d85f4a5](https://github.com/expressots/expressots-cli/commit/d85f4a5600c89026ea7eac48bf52f492805f6e6e))
- add middleware scaffold ([5ffcac1](https://github.com/expressots/expressots-cli/commit/5ffcac103bf163c577c89142c2290b51277def18))
- adjust templates and module creation ([56aaea6](https://github.com/expressots/expressots-cli/commit/56aaea6fb872232bad2133b6d75bbde25441d1b1))
- cmds add for op and nonop templates ([53b450f](https://github.com/expressots/expressots-cli/commit/53b450f2b034df294744727a7c73e68a3488a42f))
- improve dev command performance and rm nonused pkgs ([ecc693d](https://github.com/expressots/expressots-cli/commit/ecc693d0b9f8425b1d95b82d0f461c5c1c4b350b))

### Bug Fixes

- **cli.ts:** fix the order of choices in the "template" option to match the order in the form ([52d783f](https://github.com/expressots/expressots-cli/commit/52d783f9640cc9ef4ec18dc769297c34e040d9d5))

### Code Refactoring

- adjust op and nop templates, proj confirm msg ([d2bbc2e](https://github.com/expressots/expressots-cli/commit/d2bbc2e8fcfeebcb064d8c2278bfa1ad02464cc4))
- adjust sponsor message spacing ([a1ff88d](https://github.com/expressots/expressots-cli/commit/a1ff88df86940f3a63baca9c11a5fb83a89a46a8))
- improve new cmd cli performance ([1782206](https://github.com/expressots/expressots-cli/commit/1782206b3991269598a071c18dd8b406946d0755))

## [1.5.0](https://github.com/expressots/expressots-cli/compare/1.4.0...1.5.0) (2023-10-21)

### Features

- add base repository and interface from prisma provider template ([d643830](https://github.com/expressots/expressots-cli/commit/d643830216d5d88196b70dbe2e4e2df19c9d1e39))
- add base repository and interface from prisma provider template ([a42c9bb](https://github.com/expressots/expressots-cli/commit/a42c9bb5a2c1cadee064b9f4ede853caf72f4800))
- add base repository templatess ([3390346](https://github.com/expressots/expressots-cli/commit/339034618046ff43af1b585c6fcb26cba13ae3a1))
- add base repository templatess ([bc42738](https://github.com/expressots/expressots-cli/commit/bc42738ca9f0f40505ec42ed970f13f88dcd48e9))
- add better log messages during installation ([8d1766e](https://github.com/expressots/expressots-cli/commit/8d1766e44abd8f30eb83bd40f4c45cf791e4741e))
- add prisma provider configuration expressots.config file ([0b656f3](https://github.com/expressots/expressots-cli/commit/0b656f3bd7fa4966929d71248d45b8928f3ff608))
- add prisma provider configuration expressots.config file ([674f7df](https://github.com/expressots/expressots-cli/commit/674f7dfe69d867cbb4f86dbd1e25a0c8a246ec7e))
- add process to install database driver when opt-in ([80e848e](https://github.com/expressots/expressots-cli/commit/80e848e17f838f20500ab211d8e68f871d4462cd))
- add process to install database driver when opt-in ([ebe6fed](https://github.com/expressots/expressots-cli/commit/ebe6fed0b7dbff2297eee5087e144b4f31152c59))
- add script pck.json codegen ([7ffd673](https://github.com/expressots/expressots-cli/commit/7ffd673407be59c5e824a0c5df3c1a9adb15940e))
- change base repository and interface to fix DI and typescript errors ([96fb098](https://github.com/expressots/expressots-cli/commit/96fb098640c0ce0290462359489256b04cab3341))
- change base repository and interface to fix DI and typescript errors ([475e6b2](https://github.com/expressots/expressots-cli/commit/475e6b20e5e762fbead4c83bc14f628dea3c1129))

### Bug Fixes

- add new text for CLI add command ([83eef1c](https://github.com/expressots/expressots-cli/commit/83eef1ccf93f8a09280a2dd6711fc00145d136bf))
- add new text for CLI add command ([68e7b1b](https://github.com/expressots/expressots-cli/commit/68e7b1b25b0158e5abfc8d2be23e28bce8dc7572))
- add prisma provider download cmd ([0093412](https://github.com/expressots/expressots-cli/commit/0093412f9b2d746c7e5e2779cbd222bf694cd10c))
- add prisma question to override install ([54933ca](https://github.com/expressots/expressots-cli/commit/54933caf5b9774ed7c5409506cebdd087922c820))
- base repository template prisma dependency ([8943e6a](https://github.com/expressots/expressots-cli/commit/8943e6a9b4d4af8098907c69272b7404fadf315d))
- CLI documentation link ([62f403b](https://github.com/expressots/expressots-cli/commit/62f403b493b7a101151978082e913237e07c89ed))
- copy prisma base repository templates ([9277285](https://github.com/expressots/expressots-cli/commit/927728535835a3f380310f97f042384d80027ce4))
- linter fix ([5cf14fa](https://github.com/expressots/expressots-cli/commit/5cf14fa1f3a36670fc25fcf26db0fe9ffcc91682))
- replace providers object when it already exists in expressots config file ([eea0c6f](https://github.com/expressots/expressots-cli/commit/eea0c6fe7738dd6e6d767214bfbd570b2ff6129f))
- replace providers object when it already exists in expressots config file ([2e3b425](https://github.com/expressots/expressots-cli/commit/2e3b425409190680722fb32f6717731e4edf0752))
- using yarn and pnpm to install dependencies ([08cc02d](https://github.com/expressots/expressots-cli/commit/08cc02d11a3704b74d8530bdbd6bb2f74813f01c))
- using yarn and pnpm to install dependencies ([ccff34d](https://github.com/expressots/expressots-cli/commit/ccff34d3f7d33a903c41aadc586e7de025b3e942))

## [1.4.0](https://github.com/expressots/expressots-cli/compare/1.3.4...1.4.0) (2023-09-27)

### Features

- add bun as package manager ([9a6593e](https://github.com/expressots/expressots-cli/commit/9a6593e6bf000e5bd05bfe722dfae44177bc02fd))
- add codeql & dependabot ([94f31d1](https://github.com/expressots/expressots-cli/commit/94f31d14b9bdc593774bef86f4346d4ed24628bb))
- add module scaffold ([6491ffb](https://github.com/expressots/expressots-cli/commit/6491ffbf6ab1f96edf41d5e80cf2642dbcc58569))
- vite test env ([9a2c908](https://github.com/expressots/expressots-cli/commit/9a2c908f8fe405750d3f9cc55f21f15ba53fe4f2))

### Bug Fixes

- add linter and format ([bcaed48](https://github.com/expressots/expressots-cli/commit/bcaed484929a641f1863d46b5e38fc7793400f4e))
- howto doc ([2e4ae5a](https://github.com/expressots/expressots-cli/commit/2e4ae5a93e608556923068ca588f49767a7e3f7a))
- show bun option only on linux ([2e665e3](https://github.com/expressots/expressots-cli/commit/2e665e30634172b5cc7d9ceeae5fd9398e687adc))

## [1.3.4](https://github.com/expressots/expressots-cli/compare/1.3.3...1.3.4) (2023-09-17)

### Bug Fixes

- update dependency ([0769477](https://github.com/expressots/expressots-cli/commit/07694777736b05a3c2045eb10b04092ff14bb761))
- v2 updates on scaffold resources ([7335c3a](https://github.com/expressots/expressots-cli/commit/7335c3a308dc52aa1be67fb34b1fe60d05bd2adb))
