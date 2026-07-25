import { AppExpress } from "@expressots/adapter-express";
import { AppContainer, CreateModule } from "@expressots/core";
import { AppController } from "./app.controller";
import { JobController } from "./jobs/job.controller";
import { QueueProvider } from "@providers/queue/queue.provider";

export class App extends AppExpress {
    private readonly container: AppContainer = this.configContainer([
        CreateModule([AppController, JobController, QueueProvider]),
    ]);

    globalConfiguration(): void {
        this.setGlobalRoutePrefix("/api");
    }

    async configureServices(): Promise<void> {
        this.Middleware.applyPreset("api");
    }

    async postServerInitialization(): Promise<void> {}

    async serverShutdown(): Promise<void> {}
}
