import { BaseController, StatusCode } from "@expressots/core";
import {
  controller,
  httpGet,
  queryParam,
  response,
} from "inversify-express-utils";
import { PokebattleUseCase } from "./pokebattle.usecase";
import {
  IPokebattleHistoryRequestDTO,
  IPokebattleHistoryResponseDTO,
} from "./pokebattle.dto";

@controller("/pokebattle/history")
class PokebattleController extends BaseController {
  constructor(private pokebattleUseCase: PokebattleUseCase) {
    super("pokebattle-controller");
  }

  @httpGet("/")
  execute(
    @response() res: any,
    @queryParam() params: IPokebattleHistoryRequestDTO,
  ): Promise<IPokebattleHistoryResponseDTO> {
    return this.callUseCaseAsync(
      this.pokebattleUseCase.execute(params),
      res,
      StatusCode.OK,
    );
  }
}

export { PokebattleController };
