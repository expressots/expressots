const Env = {
    Express: {
        PORT: process.env.PORT
    },
    Mailtrap: {
        HOST: process.env.MAILTRAP_HOST as string,
        PORT:Number(process.env.MAILTRAP_PORT),
        USERNAME:process.env.MAILTRAP_USERNAME,
        PASSWORD:process.env.MAILTRAP_PASSWORD,
    },
    Server: {
        APP_NAME: process.env.APP_NAME,
        MODE: process.env.ENVIRONMENT,
        TIMEZONE: process.env.TIMEZONE,
        LANGUAGE: process.env.DEFAULT_LANGUAGE
    },
    Support: {
        ADMIN_EMAIL: process.env.ADMIN_EMAIL
    },
    Security: {
        JWT_PRIVATE_KEY: process.env.SECURITY_JWT_PRIVATE_KEY as string
    }
}

export { Env };