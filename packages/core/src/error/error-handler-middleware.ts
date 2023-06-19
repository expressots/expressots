import { NextFunction, Request, Response } from "express";
import { IAppError } from "./report";
import { StatusCode } from "./status-code";

/**
 * errorHandler is a custom Express error-handling middleware function.
 * It logs the error, sets the status code, and sends a JSON response containing the status code and error message.
 * @param error - An instance of IAppError containing error details.
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @param next - The Express next function for passing control to the next middleware function.
 */
function errorHandler(error: IAppError, req: Request, res: Response, next: NextFunction): void {
    res.status(error.statusCode || StatusCode.InternalServerError).json({statusCode: error.statusCode, error: error.message});
}

export default errorHandler;