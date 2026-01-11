# ExpressoTS Micro

A lightweight, minimal ExpressoTS microservice template.

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
└── api.ts          # Single file API
```

## Adding Routes

```typescript
app.Route.get("/users", () => {
    return { users: [] };
});

app.Route.post("/users", (req, res) => {
    const user = req.body;
    res.status(201).json(user);
});
```

## Learn More

- [ExpressoTS Documentation](https://expresso-ts.com)
- [GitHub Repository](https://github.com/expressots)
- [Discord Community](https://discord.gg/PyPJfGK)
