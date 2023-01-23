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
import { MongooseProvider } from "@providers/orm/mongoose/Mongoose.Provider";
import { mongodbUri, options } from "@providers/database/mongodb/MongoConnectionOptions.Provider";
import mongoose from "mongoose";
import { Seed } from "@providers/database/mongodb/MongoSeed.Provider";
import Log, { LogLevel } from "@providers/logger/exception/ExceptionLogger.Provider";

const PORT = Env.Server.DEFAULT_PORT;

/* Initialize DB */
MongooseProvider.Initialize(mongodbUri, options);

/* Seed DB */
if (Env.Database.SEED === true) {
  Seed();
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
  mongoose.disconnect();
  Log(LogLevel.Info, "MongoDB connection closed", "mongoose-provider");
  Log(LogLevel.Info, "API is shutting down", "server-provider");
  process.exit(0);
});
