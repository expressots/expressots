import { NextFunction, Request, Response } from "express";
import { AppError } from "./application-error";
import { StatusCode } from "./status-code";
import { LogLevel, log } from "../logger";

/**
 * errorHandler is a custom Express error-handling middleware function.
 * It logs the error, sets the status code, and sends a JSON response containing the status code and error message.
 * @param error - An instance of AppError containing error details.
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @param next - The Express next function for passing control to the next middleware function.
 */
function errorHandler(error: AppError, req: Request, res: Response, next: NextFunction): void {
    
    log(LogLevel.Error, error, error.service || "service-undefined");
    res.status(error.statusCode || StatusCode.InternalServerError).json({statusCode: error.statusCode, error: error.message});
}

export default errorHandler;