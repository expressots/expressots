import pkg from "../package.json";

const ENV = {
  Application: {
    APP_NAME: pkg.name,
    APP_VERSION: pkg.version,
    ENVIRONMENT: process.env.ENVIRONMENT as string,
    PORT: Number(process.env.PORT),
    JWT_KEY: process.env.JWT_KEY as string,
  },
  Log: {
    FILE: process.env.FILE as string,
    FOLDER: process.env.FOLDER as string,
  },
};

export default ENV;
