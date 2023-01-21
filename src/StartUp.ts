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

const PORT = Env.Server.DEFAULT_PORT;

/* Initialize DB */
MongooseProvider.Initialize(mongodbUri, options);

/* Seed DB */
if (Env.Database.SEED) {
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
  console.log("MongoDB connection closed");
  console.log("Shutting down the API");
  process.exit(0);
});
