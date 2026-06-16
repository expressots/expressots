import { provide } from "inversify-binding-decorators";
import { DataSource } from "typeorm";
import { PostgresDBConfig } from "./postgres/postgresdb";
import { LogLevel, log } from "@expressots/core";

@provide(TypeORMProvider)
class TypeORMProvider {
    static dataSource: DataSource;

    static async connect() {
        try {
            TypeORMProvider.dataSource = new DataSource(PostgresDBConfig);
            TypeORMProvider.dataSource
                .initialize()
                .then(() => {
                    log(
                        LogLevel.Info,
                        "Database connection established",
                        "typeorm-provider-initialize",
                    );
                })
                .catch((error: any) => {
                    log(LogLevel.Error, error, "typeorm-provider");
                });
        } catch (error: any) {
            log(LogLevel.Error, error, "typeorm-provider");
        }
    }

    static async disconnect() {
        try {
            const dataSource = new DataSource(PostgresDBConfig);
            dataSource
                .destroy()
                .then(() => {
                    log(
                        LogLevel.Info,
                        "Database connection closed",
                        "typeorm-provider-destroy",
                    );
                })
                .catch((error) => {
                    log(LogLevel.Error, error, "typeorm-provider");
                });
        } catch (error: any) {
            log(LogLevel.Error, error, "typeorm-provider");
        }
    }
}

export { TypeORMProvider };
