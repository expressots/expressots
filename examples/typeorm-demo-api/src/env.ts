import pkg from "../package.json";

const ENV = {
    Application: {
        APP_NAME: pkg.name,
        APP_VERSION: pkg.version,
        ENVIRONMENT: process.env.ENVIRONMENT as string,
        PORT: Number(process.env.PORT),
    },
    Log: {
        FILE: process.env.FILE as string,
        FOLDER: process.env.FOLDER as string,
    },
    Cors: {
        ORIGIN: process.env.CORS_ORIGIN,
    },
};

export default ENV;
