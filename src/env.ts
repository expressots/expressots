const Env = {
    Express: {
        PORT: process.env.PORT
    },
    Mailtrap: {
        MAILTRAP_HOST: process.env.MAILTRAP_HOST as string,
        MAILTRAP_PORT:Number(process.env.MAILTRAP_PORT),
        MAILTRAP_USERNAME:process.env.MAILTRAP_USERNAME,
        MAILTRAP_PASSWORD:process.env.MAILTRAP_PASSWORD,
    },
    Server: {
        APP_NAME: process.env.APP_NAME,
        MODE: process.env.ENVIRONMENT,
        TIMEZONE: process.env.TIMEZONE,
        LANGUAGE: process.env.DEFAULT_LANGUAGE
    },
    Support: {
        ADMIN_EMAIL: process.env.ADMIN_EMAIL
    }
}

export { Env };