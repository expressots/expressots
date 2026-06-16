import { Container } from "inversify";
import { AppContainer } from "@expressots/core";
import { AppModule } from "@useCases/app/app.module";
import { UserModule } from "@useCases/user/user.module";

const appContainer = new AppContainer();

export const container: Container = appContainer.create([
    // Add your modules here
    AppModule,
    UserModule,
]);
