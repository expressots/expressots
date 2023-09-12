import "reflect-metadata";
import { Request, Response, NextFunction, RequestHandler } from "express";
import { StatusCode } from "../../error/status-code";
import { packageResolver } from "../../common/package-resolver.provider";
import { Logger } from "../logger/logger-service";

/**
 * Validate the DTO using class-validator and class-transformer.
 * @param type - The type of the DTO to validate.
 * @returns A RequestHandler function.
 * @throws An exception if the DTO is invalid.
 *
 */
function ValidateDTO<T extends object>(type: new () => T): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = new Logger();

    const classValidator = packageResolver("class-validator");
    const classTransformer = packageResolver("class-transformer");

    if (!classValidator || !classTransformer) {
      return next();
    }

    try {
      const errors = await classValidator.validate(
        classTransformer.plainToClass(type, req.body),
      );

      if (errors.length > 0) {
        const DTO = errors
          .map((error) =>
            error.constraints ? Object.values(error.constraints) : [],
          )
          .flat();

        res.status(StatusCode.BadRequest).json({
          errorCode: StatusCode.BadRequest,
          errorMessage: "Bad Request",
          DTO,
        });
      } else {
        next();
      }
    } catch (error) {
      logger.error(
        `An exception occurred while validating the DTO: ${error}`,
        "validate-dto-provider",
      );
      next(error);
    }
  };
}

export { ValidateDTO };
