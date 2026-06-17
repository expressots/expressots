## Install

```bash
npm i @expressots/adapter-express
```

## What This Package Does

This adapter bridges ExpressoTS Core and Express.js. It provides the HTTP server implementation, route registration, middleware pipeline, and the `App` class that wires everything together. Install it alongside `@expressots/core` to run ExpressoTS on Express.

## Quick Look

```typescript
import { ExpressAdapter } from "@expressots/adapter-express";

const app = await AppFactory.create(App, ExpressAdapter);
await app.listen(3000, "development");
```
