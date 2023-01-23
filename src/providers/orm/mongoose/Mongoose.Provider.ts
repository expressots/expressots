import mongoose from "mongoose";
import Log, { LogLevel } from "@providers/logger/exception/ExceptionLogger.Provider";

class MongooseProvider {
    public static async Initialize(uri: string, options: mongoose.ConnectOptions): Promise<void> {
        mongoose.set("strictQuery", false);

        mongoose.connect(uri, options)
            .then(() => {
                Log(LogLevel.Info, "MongoDB is connected", "mongoose-provider");
            }
            ).catch((error: any) => {
                Log(LogLevel.Error, error, "mongoose-provider");
            });
    }
}

export { MongooseProvider };