# How to Contribute to ExpressoTS

1. [Fork](https://github.com/expressots/expressots/fork) the repo and create your branch from main.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Working in the Monorepo

This repository is a pnpm + Turborepo monorepo. The framework packages live in
`packages/` (`core`, `shared`, `adapter-express`, `cli`, `boost-ts`) and the
Studio apps in `apps/`.

```bash
pnpm install        # install all workspace dependencies
pnpm build          # build every package (turbo-cached, dependency order)
pnpm test           # run every test suite
pnpm lint           # lint every package
```

To iterate on a single package and everything that depends on it:

```bash
pnpm turbo run build test --filter=@expressots/core...
```

## Testing Your Changes Locally

Unit tests catch most regressions, but before opening a PR you should also
verify your change works in a real application installed the way customers
install it. The `pack:local` script builds and packs every public package into
`.local-packs/` as npm tarballs:

```bash
pnpm pack:local
```

### 1. Scaffold a test app with the packed CLI

```bash
EXPRESSOTS_TEMPLATE_REF=main EXPRESSOTS_DEV=1 EXPRESSOTS_SKIP_INSTALL=1 \
  npx --yes --package=<monorepo>/.local-packs/expressots-cli-<version>.tgz \
  expressots new my-app -t application -p npm
```

What the environment variables do:

| Variable                                         | Purpose                                                                                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `EXPRESSOTS_TEMPLATE_REF=main`                   | Fetch templates from the `main` branch of `expressots/templates` instead of the version tag (which only exists for published releases). |
| `EXPRESSOTS_DEV=1` + `EXPRESSOTS_SKIP_INSTALL=1` | Skip the automatic dependency install — the scaffolded app pins a framework version that is not on npm yet.                             |

Note: `--package=<tarball> expressots` is required. The CLI ships two binaries
(`expressots` and `ex`), so `npx <tarball>` alone cannot pick one and fails
with a confusing "Permission denied" on the tarball path.

### 2. Install the framework from the local tarballs

Install all tarballs in **one** command so internal `@expressots/*`
dependencies resolve from the sibling tarballs instead of the npm registry:

```bash
cd my-app
npm install <monorepo>/.local-packs/expressots-{core,shared,adapter-express,cli}-<version>.tgz
```

### 3. Build and run

```bash
npm run build
npm run dev    # watch mode; or `npm run prod` for the compiled build
curl http://localhost:3000/api/health
```

After editing framework code, repeat `pnpm pack:local` (fast — turbo only
rebuilds what changed) and re-run the `npm install ...tgz` command in the test
app to pick up the new tarballs.

### Why tarballs instead of `npm link`?

ExpressoTS uses inversify + reflect-metadata for dependency injection.
Symlink-based linking can load a second copy of reflect-metadata (the
framework's copy alongside the app's), which silently breaks decorator
metadata and container resolution. Packed tarballs also exercise exactly what
gets published — the `exports` map, dual CJS/ESM entry points, and the `files`
whitelist — so packaging mistakes surface before release instead of after.

## How to Contribute to the Documentation

We are currently using Docusaurus version 2.4.1. For more information about Docusaurus, please visit the [Docusaurus website](https://docusaurus.io/docs)

Follow the steps above from 1 to 6. In addition execute the following commands:

```bash
npm install
```

And run the project in development mode with:

```bash
npm start
```

### [ Doc ] Issues and Feature Requests Labels

- **[doc fix]**: A documentation fix
- **[doc update]**: A documentation update
- **[feature]**: A new feature
- **[new doc]**: A new documentation
- **[translation]**: A new translation

### [ Doc ] Submitting your Pull Request

### [ Doc ] Description

Please include a summary of the change and which issue is fixed. Please also include relevant motivation and context. List any dependencies that are required for this change.

Fixes # (issue)

### [ Doc ] Type of change

Please delete options that are not relevant.

- [ ] Documentation fix
- [ ] Documentation update
- [ ] New Feature
- [ ] Translation:: New language

## Report an Issue or a Bug

If you find a bug in the source code, you can help us by submitting an issue in the **[Issue reporting channel](https://github.com/expressots/expressots/issues)**. Even better, you can submit a **[Pull Request](https://github.com/expressots/expressots/pulls)** with a fix.

## Request a feature

You can request a new feature by submitting an issue in the **[Issue reporting channel](https://github.com/expressots/expressots/issues)**.

If you would like to implement the new feature, please submit an issue describing your proposal first. This will allow us to provide feedback, ensure that the feature is aligned with the project goals and that you are not duplicating work.

## Coding Guidelines

Here are the coding guidelines we use for ExpressoTS: [Typescript Coding Guidelines](https://github.com/rsaz/TypescriptCodingGuidelines/blob/main/TypeScriptCodingGuidelines.md)

## Submitting your Pull Request

### Description

Please include a summary of the change and which issue is fixed. Please also include relevant motivation and context. List any dependencies that are required for this change.

Fixes # (issue)

### How Has This Been Tested?

Please describe the tests that you ran to verify your changes. Provide instructions so we can reproduce. Please also list any relevant details for your test configuration if applicable.

- [ ] Test A
- [ ] Test B

**Test Configuration**:

- OS:
- Browser:
- Documentation language:: English

### Checklist:

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published in downstream modules
