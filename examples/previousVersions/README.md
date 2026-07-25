# Previous Versions

> **Warning: legacy code. Do not use as a reference for v4 projects.**
>
> These examples target **ExpressoTS v1/v2** and rely on APIs that were **removed in v4**: `AppFactory`, `BaseController`, `IMiddleware`, plus pre-v4 tooling (`inversify-express-utils`, `ts-node-dev`). Some of them pin `@expressots/core@latest`, so a fresh install will pull a v4 release and break them.
>
> They are preserved for historical reference only. Do not copy patterns, imports, or configuration from them into a v4 project. For new projects and v4 patterns, see the [v4 catalog](../CATALOG.md).

| Folder | Description | Era |
| --- | --- | --- |
| [01-history](./01-history/) | Raw Inversify + Express demo | Pre-framework |
| [02-typeorm-demo](./02-typeorm-demo/) | TypeORM API + Vue/React UI | v1.x |
| [03-opinionated-with-docker](./03-opinionated-with-docker/) | Dockerized v1 app | v1.x |
| [04-poke-battle-with-prisma](./04-poke-battle-with-prisma/) | Prisma + JWT game API | v1.x |
| [05-postgres-connection-pool-repository](./05-postgres-connection-pool-repository/) | Postgres pool + repository | v2 transition |

## Migration

For v4 equivalents:

| Legacy | v4 replacement |
| --- | --- |
| 04-poke-battle JWT + Prisma | [02-jwt-authentication](../02-jwt-authentication/) + [06-database-prisma](../06-database-prisma/) |
| 05-postgres pool | [05-database-postgres](../05-database-postgres/) |
| 03-docker | [12-docker-compose](../12-docker-compose/) |

See the [upgrade guide](https://doc.expresso-ts.com/docs/prologue/upgrade_guide) for migration steps.
