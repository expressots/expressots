import { BaseController, StatusCode } from "@expressots/core";
import {
  controller,
  httpPost,
  requestBody,
  requestHeaders,
  response,
} from "inversify-express-utils";
import { PokebattleBattleUseCase } from "./pokebattle-battle.usecase";
import {
  IPokebattleBattleRequestDTO,
  IPokebattleBattleResponseDTO,
} from "./pokebattle-battle.dto";

import authMiddleware from "@providers/middlewares/auth";

@controller("/pokebattle/battle")
class PokebattleBattleController extends BaseController {
  constructor(private pokebattleBattleUseCase: PokebattleBattleUseCase) {
    super("pokebattle-battle-controller");
  }

  @httpPost("/", authMiddleware)
  execute(
    @requestBody() data: IPokebattleBattleRequestDTO,
    @response() res: any,
    @requestHeaders("decoded") req,
  ): Promise<IPokebattleBattleResponseDTO> {
    return this.callUseCaseAsync(
      this.pokebattleBattleUseCase.execute({ body: data, token: req }),
      res,
      StatusCode.OK,
    );
  }
}

export { PokebattleBattleController };
