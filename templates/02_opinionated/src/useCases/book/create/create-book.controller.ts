import { BaseController, StatusCode } from "@expressots/core";
import {
  controller,
  httpPost,
  requestBody,
  response,
} from "inversify-express-utils";
import { ICreateBookDTO, ICreateBookResponseDTO } from "./create-book.dto";
import { CreateBookUseCase } from "./create-book.usecase";

@controller("/book/create")
class CreateBookController extends BaseController {
  constructor(private createBookUseCase: CreateBookUseCase) {
    super("create-user-controller");
  }

  @httpPost("/")
  execute(
    @requestBody() data: ICreateBookDTO,
    @response() res: any,
  ): ICreateBookResponseDTO {
    return this.callUseCase(
      this.createBookUseCase.execute(data),
      res,
      StatusCode.Created,
    );
  }
}

export { CreateBookController };
