## Install

```bash
npm i @expressots/adapter-express
```

## What This Package Does

This adapter bridges ExpressoTS Core and Express.js. It provides the HTTP server implementation, route registration, middleware pipeline, and the `App` class that wires everything together. Install it alongside `@expressots/core` to run ExpressoTS on Express.

## Quick Look

```typescript
import { AppExpress } from "@expressots/adapter-express";
import { AppContainer, CreateModule, bootstrap } from "@expressots/core";
import { AppController } from "./app.controller";

export class App extends AppExpress {
  private readonly container: AppContainer = this.configContainer([
    CreateModule([AppController]),
  ]);

  async configureServices(): Promise<void> {
    // register middleware, interceptors, error handlers
  }
}

void bootstrap(App); // starts on process.env.PORT or 3000
```
