import mongoose from "mongoose";
import Log from "@providers/logger/exception/ExceptionLogger.Provider";
import { Env } from "env";

class MongooseProvider {
    public static async Initialize(uri: string, options: mongoose.ConnectOptions): Promise<void> {
        mongoose.set("strictQuery", false);

        mongoose.connect(uri, options)
            .then(() => {
                console.log("MongoDB is connected");
            }
            ).catch((error: any) => {
                Log(error, "mongoose-provider");
            });
    }
}

export { MongooseProvider };