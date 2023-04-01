import { NextFunction, Request, Response } from "express";
import { StatusCode } from "./status-code";
import { LogLevel, log } from "../logger";

interface IAppError {
    statusCode: number;
    message: string;
    service?: string
}

function errorHandler(error: IAppError, req: Request, res: Response, next: NextFunction): void {
    
    log(LogLevel.Error, error, error.service || "service-undefined");
    res.status(error.statusCode || StatusCode.InternalServerError).json({statusCode: error.statusCode, error: error.message});
}

export default errorHandler;