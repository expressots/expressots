import mongoose from "mongoose";
import { Env } from "env";

const mongodbUri: string =
    "mongodb://" +
    Env.Database.USERNAME +
    ":" +
    Env.Database.PASSWORD +
    "@" +
    Env.Database.HOST +
    "/" +
    Env.Database.NAME +
    Env.Database.EXTRA_ARGS;

const options: mongoose.ConnectOptions = {
    keepAlive: true,
    keepAliveInitialDelay: 300000
};

export { mongodbUri, options };
