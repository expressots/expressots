import { CreateModule } from "@expressots/core";
import { PokebattleBattleController } from "./battle/pokebattle-battle.controller";
import { PokebattleController } from "./history/pokebattle.controller";

const PokebattleModule = CreateModule([
  PokebattleBattleController,
  PokebattleController,
]);

export { PokebattleModule };
