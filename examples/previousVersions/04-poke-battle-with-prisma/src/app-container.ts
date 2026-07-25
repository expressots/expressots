import { AppContainer } from "@expressots/core";
import { PingModule } from "@useCases/ping/ping.module";
import { PokebattleModule } from "@useCases/pokebattle/pokebattle.module";
import { UserModule } from "@useCases/user/user.module";

const appContainer = new AppContainer();

const container = appContainer.create([
  // Add your modules here
  PingModule,
  UserModule,
  PokebattleModule,
]);

export { container };
