## Install

```bash
npm i @expressots/core
```

## What This Package Does

ExpressoTS Core is the foundation of the framework. It provides dependency injection, routing, middleware orchestration, lifecycle hooks, interceptors, guards, error handling, and the application bootstrap. Everything needed to structure and run a server-side TypeScript application with minimal boilerplate.

## Quick Look

```typescript
import { bootstrap } from "@expressots/core";
import { App } from "./app";

void bootstrap(App);
```
