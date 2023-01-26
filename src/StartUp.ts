/**
 * Class -> StartUp
 * This is the entry point of the application. This class is responsible for bootstrapping the application,
 * passing a message to console defining environment, version, app. name and port to be used.
 * 
 */
import "reflect-metadata";

import { appConfig } from "AppConfig";
import { Env } from "env";
import { ServerInversifyContainer } from "@providers/inversify/Container.Provider";
import { MongooseProvider } from "@providers/database/mongodb/orm/mongoose/Mongoose.Provider";
import { MongoSeed } from "@providers/database/mongodb/orm/mongoose/MongooseSeed";
import Log, { LogLevel } from "@providers/logger/exception/ExceptionLogger.Provider";

const PORT = Env.Server.DEFAULT_PORT;

/* Initialize DB */
MongooseProvider.DefaultConnection();

/* Seed DB */
if (Env.Database.SEED === true) {
  MongoSeed.Execute();
}

/* Initialize API */
appConfig.listen(PORT, async () => {
  ServerInversifyContainer.Init({
    appName: Env.Server.APP_NAME,
    appVersion: Env.Server.APP_VERSION,
    timezone: Env.Server.TIMEZONE,
    adminEmail: Env.Server.ADMIN_EMAIL,
    language: Env.Server.DEFAULT_LANGUAGE,
    environment: Env.Server.ENVIRONMENT,
    port: PORT,
  });
});

/* Shutdown the API */
process.on("SIGINT", () => {
  MongooseProvider.DefaultConnectionClose();
  Log(LogLevel.Info, "API is shutting down", "server-provider");
  process.exit(0);
});
