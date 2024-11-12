import "reflect-metadata";

import { Request, Response, NextFunction, RequestHandler } from "express";
import { StatusCode } from "../../error/status-code";
import { packageResolver } from "./package-resolver";
import { Logger } from "../logger/logger.provider";

/**
 * Validate the DTO using class-validator and class-transformer.
 * @param type - The type of the DTO to validate.
 * @returns A RequestHandler function.
 * @throws An exception if the DTO is invalid.
 * @public API
 */
export function ValidateDTO<T extends object>(
  type: new () => T,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = new Logger();

    const classValidator = await packageResolver("class-validator");
    const classTransformer = await packageResolver("class-transformer");

    if (!classValidator || !classTransformer) {
      return next();
    }

    try {
      const errors = await classValidator.validate(
        classTransformer.plainToClass(type, req.body),
      );

      if (errors.length > 0) {
        const DTO = errors.reduce((acc, error) => {
          if (error.constraints) {
            const propertyName = error.property;
            if (!acc.some((e) => e.property === propertyName)) {
              acc.push({ property: propertyName, messages: [] });
            }

            const target = acc.find((e) => e.property === propertyName);
            target.messages.push(...Object.values(error.constraints));
          }
          return acc;
        }, []);

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
