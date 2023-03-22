# VueJS Template 3

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur) + [use TS Take Over mode](https://github.com/johnsoncodehk/volar/discussions/471#discussioncomment-1361669).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) to make the TypeScript language service aware of `.vue` types.

If the standalone TypeScript plugin doesn't feel fast enough to you, Volar has also implemented a [Take Over Mode](https://github.com/johnsoncodehk/volar/discussions/471#discussioncomment-1361669) that is more performant. You can enable it by the following steps:

1. Disable the built-in TypeScript Extension
   1. Run `Extensions: Show Built-in Extensions` from VSCode's command palette
   2. Find `TypeScript and JavaScript Language Features`, right click and select `Disable (Workspace)`
2. Reload the VSCode window by running `Developer: Reload Window` from the command palette.

## Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Global Components

Declare all global components on `components.d.ts` and `Restart Vue Server`
( <kbd>CTRL</kbd> + <kbd>⇧ Shift</kbd> + <kbd>P</kbd> or <kbd>⌘</kbd> + <kbd>⇧ Shift</kbd> + <kbd>P</kbd> )

## Built with

- ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
- ![VueJS](https://img.shields.io/badge/Vue-%23007ACC.svg?style=for-the-badge&logo=vuedotjs)
   - Pinia
   - Vee-Validate + Yup
   - Vue-i18n
   - Vue-Router
- Eslint
- Vitest
- Husky
- Github Actions
  - Tests workflows

## Prints 📷

<details>
  <summary>Test coverage</summary>

  ## unit coverage (93%!)

  <img src="docs/prints/unit-coverage.png" alt="unit tests coverage" />

  <!-- ## e2e coverage (??%!) -->

  <!-- <img src="doc/prints/e2e-coverage.png" alt="e2e tests coverage" /> -->
</details>

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Test

```bash
# unit tests
$ npm run test:watch

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Roadmap

- [x] i18n
- [x] router
- [x] form validation
- [x] pinia
- [x] Unit tests
  - [x] Coverage 100% (93%)
- [x] husky
  - [x] lint
  - [x] unit test
- [ ] e2e tests
  - [ ] Coverage 100% (??%)
- [x] Run tests on Pull Requests
- [x] PR template
- [ ] Server-side rendering
  - [ ] SEO