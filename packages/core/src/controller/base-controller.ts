/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "express";
import { provide } from "inversify-binding-decorators";
import { interfaces } from "inversify-express-utils";

/**
 * The BaseController class is an abstract base class for controllers.
 * It provides methods for handling use case calls and sending appropriate responses.
 * @provide BaseController
 */
@provide(BaseController)
abstract class BaseController implements interfaces.Controller {
  private serviceName: string;

  /**
   * Constructs a new BaseController instance with a specified service name.
   * @param serviceName - The name of the service associated with the controller.
   */
  constructor(serviceName: string = "") {
    this.serviceName = serviceName;
  }

  /**
   * Calls an asynchronous use case and sends an appropriate response based on the result.
   * @param useCase - A promise representing the asynchronous use case to call.
   * @param res - The Express response object.
   * @param successStatusCode - The HTTP status code to return upon successful execution.
   */
  protected async callUseCaseAsync(
    useCase: Promise<any>,
    res: any,
    successStatusCode: number,
  ) {
    return res.status(successStatusCode).json(await useCase);
  }

  /**
   * Calls a use case and sends an appropriate response based on the result.
   * @param useCase - The use case to call.
   * @param res - The Express response object.
   * @param successStatusCode - The HTTP status code to return upon successful execution.
   */
  protected callUseCase(useCase: any, res: any, successStatusCode: number) {
    return res.status(successStatusCode).json(useCase);
  }

  /**
   * Synchronously renders a template with the given options using the Express `Response` object's render method.
   *
   * @protected
   * @method callUseRender
   *
   * @param {Response} res - The Express `Response` object.
   * @param {string} template - The name of the template to render.
   * @param {Object} [options={}] - An optional object containing data to be passed to the template.
   *
   */
  protected callUseRender(res: Response, template: string, options = {}): void {
    return res.render(template, options);
  }

  /**
   * Asynchronously renders a template with the given options using the Express `Response` object's render method.
   *
   * @protected
   * @method callUseRenderAsync
   *
   * @param {Response} res - The Express `Response` object.
   * @param {string} template - The name of the template to render.
   * @param {Object} [options={}] - An optional object containing data to be passed to the template.
   *
   */
  protected callUseRenderAsync(
    res: Response,
    template: string,
    options = {},
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      res.render(template, options, (err, compiled) => {
        if (err) {
          reject(err);
        }
        resolve(compiled);
      });
    });
  }
}

export { BaseController };
