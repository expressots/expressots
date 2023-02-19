import { AppContainer } from "@expressots/core/";

import { UserModule } from "./useCases/user/user.module";
import { PingModule } from "./useCases/ping/ping.module";

const appContainer = new AppContainer();

const container = appContainer.create([
  // Add your modules here
  PingModule,
  UserModule,
]);

export { container };
