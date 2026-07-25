import { micro } from "@expressots/adapter-express";

const MOCK_USERS = [
    { id: "1", name: "Ada Lovelace", email: "ada@example.com" },
    { id: "2", name: "Grace Hopper", email: "grace@example.com" },
    { id: "3", name: "Margaret Hamilton", email: "margaret@example.com" },
];

const app = micro({
    showBanner: process.env.NODE_ENV !== "test",
});

app.get("/", () => ({
    name: "ExpressoTS Micro API",
    example: "13-micro-api",
    message: "Hello from ExpressoTS Micro API!",
    docs: "https://doc.expresso-ts.com/docs/guides/micro-api",
}));

app.get("/health", () => ({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
}));

app.get("/users", () => ({
    users: MOCK_USERS,
    count: MOCK_USERS.length,
}));

app.setErrorHandler((err, _req, res) => {
    res.status(500).json({ error: err.message });
});

const port = Number(process.env.PORT) || 3000;
void app.listen(port, {
    appName: "ExpressoTS Micro API",
    appVersion: "1.0.0",
});
