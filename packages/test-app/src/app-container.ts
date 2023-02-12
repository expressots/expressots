import { AppContainer } from "@expressots/core/";
import { PingModule } from "./providers/ping/ping.module";
import { UserModule } from "./useCases/user/user.module";
import { BookModule } from "./useCases/book/book.module";

const appContainer = new AppContainer();

const container = appContainer.create([
    // Add your modules here
    PingModule,
    UserModule,
    BookModule

]);

export { container };