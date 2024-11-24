import { createMicroAPI } from "@expressots/adapter-express";
import { Request, Response } from "express";

const microAPI = createMicroAPI();
microAPI.setGlobalRoutePrefix("/v1");

const app = microAPI.build();
app.Middleware.addBodyParser();

app.Route.get("/", (req: Request, res: Response) => {
    res.send("Hello from ExpressoTS!");
});

app.listen(3000);
