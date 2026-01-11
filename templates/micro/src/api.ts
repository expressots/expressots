import { createMicroAPI } from "@expressots/adapter-express";

const microAPI = createMicroAPI();
const app = microAPI.build();

app.Middleware.parse();

app.Route.get("/", () => {
    return "Hello from ExpressoTS Micro API!";
});

app.listen(3001);

console.log("Server is running on port 3001");
