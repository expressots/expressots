import pkg from "../package.json";

const ENV = {
    Application: {
        APP_NAME: pkg.name,
        APP_VERSION: pkg.version,
        ENVIRONMENT: process.env.ENVIRONMENT || "Development",
        PORT: Number(process.env.PORT || 3000),
    },
    Log: {
        FILE: process.env.FILE || "general",
        FOLDER: process.env.FOLDER || "logs",
    },
};

export default ENV;
