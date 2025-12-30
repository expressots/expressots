# ExpressoTS Application

A modern, type-safe Node.js backend powered by ExpressoTS v4.0.

## Features

- 🔧 **Type-Safe Configuration** - Full TypeScript inference for config values
- 🚀 **Zero-Config Bootstrap** - Just run and go
- 📦 **Build-Time Path Resolution** - No runtime overhead
- 🧪 **Testing Ready** - Jest configured out of the box

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run in production
npm run prod
```

## Project Structure

```
src/
├── main.ts          # Application entry point
├── app.ts           # Application class (middleware, lifecycle)
├── config.ts        # Type-safe configuration
└── app.controller.ts # Example controller
```

## Configuration

Configuration is managed through `src/config.ts` using the `defineConfig` helper:

```typescript
export const appConfig = defineConfig({
    app: {
        name: Env.string("APP_NAME").default("My App"),
        version: Env.string("APP_VERSION").default("1.0.0"),
    },
    server: {
        port: Env.number("PORT").default(3000),
    },
});
```

### Environment Files

- `.env.local` - Development environment (default)
- `.env.staging` - Staging environment  
- `.env.prod` - Production environment

## Scaffolding

Use the CLI to generate new resources:

```bash
# Generate a controller
npx expressots generate controller user

# Generate a use case
npx expressots generate usecase user/create-user

# Generate a module with controller and use case
npx expressots generate module user
```

### Scaffold Configuration

Customize scaffolding in `expressots.config.ts`:

```typescript
const config: ExpressoConfig = {
    opinionated: true,  // Enable structured folders
    scaffoldPattern: Pattern.KEBAB_CASE,
    scaffoldSchematics: {
        controller: "controllers",
        usecase: "useCases",
        entity: "entities",
    },
};
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/ | Application info |
| GET | /api/health | Health check |

## Learn More

- [ExpressoTS Documentation](https://expresso-ts.com)
- [GitHub Repository](https://github.com/expressots)
- [Discord Community](https://discord.gg/PyPJfGK)

