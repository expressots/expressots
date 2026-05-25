import { micro } from "@expressots/adapter-express";

const app = micro();

app.get("/", () => "Hello from ExpressoTS Micro API!");

app.listen(3000);
