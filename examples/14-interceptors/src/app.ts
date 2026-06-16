import { AppExpress, setupInterceptorsForExpress } from "@expressots/adapter-express";
import { AppContainer, CreateModule } from "@expressots/core";
import { DemoController } from "./demo/demo.controller";
import { LoggingInterceptor } from "./interceptors/logging.interceptor";
import { TimingInterceptor } from "./interceptors/timing.interceptor";

export class App extends AppExpress {
    private readonly container: AppContainer = this.configContainer([
        CreateModule([DemoController, LoggingInterceptor, TimingInterceptor]),
    ]);

    globalConfiguration(): void {
        this.setGlobalRoutePrefix("/api");
    }

    async configureServices(): Promise<void> {
        this.Middleware.applyPreset("api");

        setupInterceptorsForExpress(this.container.Container, {
            customInterceptors: [LoggingInterceptor, TimingInterceptor],
        });
    }

    async postServerInitialization(): Promise<void> {}

    async serverShutdown(): Promise<void> {}
}
