const $ = require('dotenv').config();

const Env = {
    express: {
        EXPRESS_PORT: process.env.EXPRESS_PORT
    },
    mailtrap: {
        MAILTRAP_HOST: process.env.MAILTRAP_HOST as string,
        MAILTRAP_PORT:Number(process.env.MAILTRAP_PORT),
        MAILTRAP_USERNAME:process.env.MAILTRAP_USERNAME,
        MAILTRAP_PASSWORD:process.env.MAILTRAP_PASSWORD,
    }
}

export { Env };