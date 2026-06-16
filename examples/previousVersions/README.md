# Previous Versions

These examples target **ExpressoTS v1/v2** and pre-v4 patterns (`AppFactory`, `inversify-express-utils`, `ts-node-dev`). They are preserved for historical reference.

Do not use them as starting points for new v4 projects. See the [v4 catalog](../CATALOG.md) instead.

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
