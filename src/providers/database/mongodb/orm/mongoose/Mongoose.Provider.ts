import mongoose, { Connection } from "mongoose";
import Log, { LogLevel } from "@providers/logger/exception/ExceptionLogger.Provider";
import { IDatabaseProvider } from "@providers/database/IDatabaseProvider";
import { ConnectionOptions, MongodbUri } from "./MongooseConnectionOptions";

class MongooseProvider implements IDatabaseProvider {

    private connection: mongoose.Connection;

    async Connect(): Promise<void> {
        this.connection = await mongoose.createConnection(
            MongodbUri,
            ConnectionOptions);

        this.connection.set("strictQuery", false);
        Log(LogLevel.Info, "MongoDB is connected", "mongoose-provider");
    }

    async Disconnect(): Promise<void> {
        Log(LogLevel.Info, "MongoDB connection closed", "mongoose-provider");
        await this.connection.close();
    }

    GetConnection(): mongoose.Connection {
        return this.connection;
    }

    async DefaultConnection(): Promise<void> {
        mongoose.set("strictQuery", false);

        mongoose.connect(MongodbUri, ConnectionOptions)
            .then(() => {
                Log(LogLevel.Info, "MongoDB is connected", "mongoose-provider");
            }
            ).catch((error: any) => {
                Log(LogLevel.Error, error, "mongoose-provider");
            });
    }

    async DefaultConnectionClose(): Promise<void> {
        Log(LogLevel.Info, "MongoDB connection closed", "mongoose-provider");
        await mongoose.connection.close();
    }
}

const MongooseProviderInstance = new MongooseProvider();

export { MongooseProviderInstance as MongooseProvider };