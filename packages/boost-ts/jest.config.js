module.exports = {
    transform: {
        "^.+\\.(t|j)sx?$": "@swc/jest",
    },
    testEnvironment: "node",
    testMatch: ["**/*.spec.ts", "**/*.test.ts"],
};
