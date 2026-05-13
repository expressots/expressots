import { micro } from "@expressots/adapter-express";

const app = micro({
    showBanner: process.env.NODE_ENV !== "test",
});

app.get("/", () => "Hello from ExpressoTS Micro API!");

app.get("/health", () => ({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
}));

app.setErrorHandler((err, _req, res) => {
    res.status(500).json({ error: err.message });
});

const port = Number(process.env.PORT) || 3000;
void app.listen(port, {
    appName: "ExpressoTS Micro",
    appVersion: "1.0.0",
});
