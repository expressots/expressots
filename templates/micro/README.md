# ExpressoTS Micro

A lightweight, minimal ExpressoTS microservice template.

## Features

- 🚀 **Minimal Footprint** - Just the essentials for microservices
- 🔧 **Type-Safe Config** - Environment variables with full TypeScript support
- ⚡ **Fast Startup** - Optimized for serverless and containers
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
└── api.ts          # Single file containing all routes and config
```

## Configuration

The micro template uses inline configuration with `defineConfig`:

```typescript
const config = defineConfig({
    app: {
        name: Env.string("APP_NAME", { default: "ExpressoTS Micro" }),
    },
    server: {
        port: Env.number("PORT", { default: 3000 }),
    },
});
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | / | Service info |
| GET | /health | Health check |

## Adding Routes

```typescript
app.Route.get("/users", (req, res) => {
    res.json({ users: [] });
});

app.Route.post("/users", (req, res) => {
    const user = req.body;
    res.status(201).json(user);
});
```

## Environment Variables

Create a `.env.local` file for development:

```env
APP_NAME="My Microservice"
APP_VERSION="1.0.0"
PORT=3000
```

## Use Cases

- Microservices in a distributed system
- Serverless functions (AWS Lambda, Vercel)
- Lightweight APIs
- Proof of concept / prototypes

## Learn More

- [ExpressoTS Documentation](https://expresso-ts.com)
- [GitHub Repository](https://github.com/expressots)
- [Discord Community](https://discord.gg/PyPJfGK)
