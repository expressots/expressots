import { createMicroAPI } from "@expressots/adapter-express";
import { Request, Response } from "express";

const microAPI = createMicroAPI();

const app = microAPI.build();

app.Route.get("/", (req: Request, res: Response) => {
    res.send("Hello from ExpressoTS Micro API!");
});

app.listen(3000);
