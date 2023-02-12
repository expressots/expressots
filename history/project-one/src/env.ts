import packageJson = require("../package.json");

const Env = {
    Server: {
        APP_NAME: packageJson.name,
        APP_VERSION: packageJson.version,
        ENVIRONMENT: process.env.ENVIRONMENT,
        TIMEZONE: process.env.TIMEZONE,
        DEFAULT_LANGUAGE: process.env.DEFAULT_LANGUAGE,
        DEFAULT_PORT: process.env.DEFAULT_PORT,
        SECURE_PORT: process.env.SECURE_PORT,
        ADMIN_EMAIL: process.env.ADMIN_EMAIL,
        CORS: process.env.CORS_ORIGIN as string,
    },
    Database: {
        TYPE: process.env.DB_TYPE as string,
        NAME: process.env.DATABASE,
        HOST: process.env.DB_HOST,
        PORT: Number(process.env.DB_PORT),
        // Remember to create the user on systems.users
        // db.createUser({user: "cleancode", pwd: "cleancode", roles: [{role: "readWrite", db: "cleancode"}, {role: "dbAdmin", db: "cleancode"}]})
        USERNAME: process.env.DB_USERNAME,
        PASSWORD: process.env.DB_PASSWORD,
        EXTRA_ARGS: process.env.DB_EXTRA_ARGS,
        SEED: process.env.DB_SEED === "true" ? true : false,
    },
    Log: {
        LOG_LEVEL: (process.env.LOG_LEVEL)?.toLowerCase() as string,
        LOG_FILE: process.env.LOG_FILE as string,
        LOG_FOLDER: process.env.LOG_FOLDER as string,
    },
    Mailtrap: {
        INBOX_ALIAS: process.env.MAILTRAP_INBOX_ALIAS as string,
        HOST: process.env.MAILTRAP_HOST as string,
        PORT: Number(process.env.MAILTRAP_PORT),
        USERNAME: process.env.MAILTRAP_USERNAME,
        PASSWORD: process.env.MAILTRAP_PASSWORD,
    },
    Security: {
        JWT_SECRET: process.env.JWT_SECRET as string,
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES as string,
        SALT_FOR_HASH: process.env.SALT_FOR_HASH
    }
}

export { Env };