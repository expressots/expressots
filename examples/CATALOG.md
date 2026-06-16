# ExpressoTS v4 Example Catalog

Runnable examples for [ExpressoTS v4.0](https://doc.expresso-ts.com/) (`4.0.0-preview.3.4`).

Each project maps to one guide or feature doc. Clone the repo, open the folder, follow its README.

| Example | Feature | Documentation |
| --- | --- | --- |
| [01-starter-api](./01-starter-api/) | Minimal REST API, middleware preset | [First steps](https://doc.expresso-ts.com/docs/core/first-steps) |
| [02-jwt-authentication](./02-jwt-authentication/) | JWT, AuthProvider, guards | [Authentication](https://doc.expresso-ts.com/docs/guides/authentication) |
| [03-authorization-rbac](./03-authorization-rbac/) | Roles, permissions, ownership | [Guards](https://doc.expresso-ts.com/docs/features/guards), [Authorization](https://doc.expresso-ts.com/docs/features/authorization) |
| [04-database-inmemory](./04-database-inmemory/) | InMemoryDBProvider | [Database integration](https://doc.expresso-ts.com/docs/guides/database-integration) |
| [05-database-postgres](./05-database-postgres/) | PostgreSQL lifecycle provider | [Database integration](https://doc.expresso-ts.com/docs/guides/database-integration) |
| [06-database-prisma](./06-database-prisma/) | Prisma ORM | [Database integration](https://doc.expresso-ts.com/docs/guides/database-integration) |
| [07-file-upload](./07-file-upload/) | `@FileUpload`, multer | [File upload](https://doc.expresso-ts.com/docs/guides/file-upload) |
| [08-events](./08-events/) | Type-safe events | [Events](https://doc.expresso-ts.com/docs/features/events) |
| [09-message-queue](./09-message-queue/) | BullMQ + Redis provider | [Lifecycle](https://doc.expresso-ts.com/docs/core/lifecycle) |
| [10-redis-cache](./10-redis-cache/) | Redis cache provider | [Provider ecosystem](https://doc.expresso-ts.com/docs/guides/provider-ecosystem) |
| [11-testing](./11-testing/) | Unit, integration, load tests | [Testing](https://doc.expresso-ts.com/docs/features/testing) |
| [12-docker-compose](./12-docker-compose/) | Multi-service Docker dev | [Deployment](https://doc.expresso-ts.com/docs/guides/deployment) |
| [13-micro-api](./13-micro-api/) | Micro API template | [Micro API](https://doc.expresso-ts.com/docs/guides/micro-api) |
| [14-interceptors](./14-interceptors/) | AOP interceptors | [Interceptors](https://doc.expresso-ts.com/docs/features/interceptors) |
| [15-openapi-studio](./15-openapi-studio/) | OpenAPI + Studio | [OpenAPI](https://doc.expresso-ts.com/docs/features/openapi), [Studio](https://doc.expresso-ts.com/docs/studio/overview) |

## Previous versions

Pre-v4 examples live under [previousVersions/](./previousVersions/). They target ExpressoTS v1/v2 and are kept for reference only.

## Requirements

- Node.js `>= 20.18.0`
- npm (or pnpm/yarn)
- Optional: Docker for Postgres, Redis, and compose-based examples

## Quick start

```bash
git clone https://github.com/expressots/examples.git
cd examples/01-starter-api
npm install
cp .env.example .env
npm run dev
```

## Branch

v4 examples on `main` are pinned to `@expressots/*@4.0.0-preview.3.4`.
