interface IEnv {
    Application: {
        APP_NAME: string;
        APP_VERSION: string;
        TIMEZONE: string;
        ADMIN_EMAIL: string;
        LANGUAGE: string;
        ENVIRONMENT: string;
        HTTPS: boolean;
        PORT: string;
    },
}

export { IEnv };