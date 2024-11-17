import pkg from "../package.json";

export const env = {
    App: {
        appName: pkg.name,
        appVersion: pkg.version,
        get Port() {
            return process.env.PORT || 3000;
        }
    },
};