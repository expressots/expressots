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
    Mailtrap: {
        HOST: process.env.MAILTRAP_HOST as string,
        PORT: Number(process.env.MAILTRAP_PORT),
        USERNAME: process.env.MAILTRAP_USERNAME,
        PASSWORD: process.env.MAILTRAP_PASSWORD,
    },

    Security: {
        JWT_PRIVATE_KEY: process.env.SECURITY_JWT_PRIVATE_KEY as string,
        SALT_FOR_HASH: process.env.SALT_FOR_HASH
    }
}

export { Env };