import { Movie } from "@entities/movie.entity";
import { DataSourceOptions } from "typeorm";

const postgresDBConfig: DataSourceOptions = {
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "postgres",
    password: "postgres",
    database: "movieapp",
    synchronize: true,
    entities: [Movie],
};

export { postgresDBConfig as PostgresDBConfig };
