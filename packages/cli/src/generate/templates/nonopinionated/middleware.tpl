import { ExpressoMiddleware, provide } from "@expressots/core";
import { NextFunction, Request, Response } from "express";

@provide({{className}}{{schematic}})
export class {{className}}{{schematic}} extends ExpressoMiddleware {
    use(req: Request, res: Response, next: NextFunction): void | Promise<void> {
        throw new Error("Method not implemented.");
    }
}