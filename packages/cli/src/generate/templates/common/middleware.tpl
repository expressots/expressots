import { ExpressoMiddleware } from "@expressots/core";
import { NextFunction, Request, Response } from "express";
import { provide } from "inversify-binding-decorators";

@provide({{className}}{{schematic}})
export class {{className}}{{schematic}} extends ExpressoMiddleware {
    use(req: Request, res: Response, next: NextFunction): void | Promise<void> {
        throw new Error("Method not implemented.");
    }
}