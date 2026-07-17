# ExpressoTS Examples

<div align="center">
  <a href="https://expresso-ts.com">
    <img src="./expressots.png" alt="ExpressoTS" width="120">
  </a>

  <h1>ExpressoTS v4 Examples</h1>

  <p>Focused, runnable examples for common backend patterns with ExpressoTS v4.</p>
</div>

---

## v4 catalog

See **[CATALOG.md](./CATALOG.md)** for the full list of 15 examples mapped to documentation.

| # | Example | Topic |
| --- | --- | --- |
| 01 | [starter-api](./01-starter-api/) | Minimal REST API |
| 02 | [jwt-authentication](./02-jwt-authentication/) | JWT + AuthProvider |
| 03 | [authorization-rbac](./03-authorization-rbac/) | Roles and permissions |
| 04 | [database-inmemory](./04-database-inmemory/) | InMemoryDBProvider |
| 05 | [database-postgres](./05-database-postgres/) | PostgreSQL provider |
| 06 | [database-prisma](./06-database-prisma/) | Prisma ORM |
| 07 | [file-upload](./07-file-upload/) | File uploads |
| 08 | [events](./08-events/) | Event system |
| 09 | [message-queue](./09-message-queue/) | BullMQ jobs |
| 10 | [redis-cache](./10-redis-cache/) | Redis cache |
| 11 | [testing](./11-testing/) | Test utilities |
| 12 | [docker-compose](./12-docker-compose/) | Docker Compose dev |
| 13 | [micro-api](./13-micro-api/) | Micro API |
| 14 | [interceptors](./14-interceptors/) | Interceptors |
| 15 | [openapi-studio](./15-openapi-studio/) | OpenAPI + Studio |

**Preview pin:** `@expressots/*@4.0.0-preview.3.4`

## Previous versions

Pre-v4 examples are under **[previousVersions/](./previousVersions/)**.

## Quick start

```bash
git clone https://github.com/expressots/examples.git
cd examples/01-starter-api
npm install
cp .env.example .env
npm run dev
```

## Test all examples

```bash
./scripts/test-all.sh
```

## Known limitations

See **[issues.md](./issues.md)** for known limitations: framework bugs, doc drift, and workarounds discovered while building these examples.

## Documentation

- [doc.expresso-ts.com](https://doc.expresso-ts.com)
- [First steps](https://doc.expresso-ts.com/docs/core/first-steps)
- [Example projects](https://doc.expresso-ts.com/docs/guides/example-projects)

## License

MIT — see [LICENSE](./LICENSE.md).
