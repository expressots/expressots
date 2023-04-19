import { AppContainer } from "@expressots/core/";
import { MovieModule } from "@useCases/movie/movie.module";
import { PingModule } from "@useCases/ping/ping.module";
import { UserModule } from "@useCases/user/user.module";

const appContainer = new AppContainer();

const container = appContainer.create([
    // Add your modules here
    PingModule,
    //UserModule,
    MovieModule,
]);

export { container };
