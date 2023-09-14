/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "express";
import { provide } from "inversify-binding-decorators";
import { Controller } from "@expressots/adapter-express";
/**
 * The BaseController class is an abstract base class for controllers.
 * It provides methods for handling use case calls and sending appropriate responses.
 * @provide BaseController
 */
@provide(BaseController)
abstract class BaseController implements Controller {
  /**
   * Calls an asynchronous use case and sends an appropriate response based on the result.
   * @param useCase - A promise representing the asynchronous use case to call.
   * @param res - The Express response object.
   * @param successStatusCode - The HTTP status code to return upon successful execution.
   */
  protected async callUseCaseAsync(
    useCase: Promise<any>,
    res: Response,
    successStatusCode: number,
  ): Promise<any> {
    return res.status(successStatusCode).json(await useCase);
  }

  /**
   * Calls a use case and sends an appropriate response based on the result.
   * @param useCase - The use case to call.
   * @param res - The Express response object.
   * @param successStatusCode - The HTTP status code to return upon successful execution.
   */
  protected callUseCase(
    useCase: any,
    res: Response,
    successStatusCode: number,
  ): any {
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
