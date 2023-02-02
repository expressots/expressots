import { ConsoleMessageProvider } from '@providers/core/console/ConsoleMessage.Provider';
import { provide } from 'inversify-binding-decorators';
import { Env } from 'env';
import { Environments } from '@providers/core/envValidator/EnvValidator.Provider';
import { Container } from 'inversify';
import { InversifyExpressServer } from 'inversify-express-utils';
import express from "express";
import cors from "cors";
import morgan from "morgan";
import compression from "compression";
import rfs from "rotating-file-stream";
import { MorganLog } from "@providers/core/logger/morgan/MorganLog.Provider";
import { MorganDefaultFormat } from "@providers/core/logger/morgan/MorganTokens";
import { MongooseProvider } from '@providers/database/mongodb/orm/mongoose/Mongoose.Provider';
import { MongoSeed } from '@providers/database/mongodb/orm/mongoose/MongooseSeed';


@provide(ServerProvider)
class ServerProvider {

    private app: express.Application;
    private port: any;

    constructor(private consoleMessageProvider: ConsoleMessageProvider) { }

    /* Add any service that you want to be initialized before the server starts */
    private async ConfigureServices(): Promise<void> {

        /* Check if .env file exists and all environment variables are defined */
        Environments.CheckAll();
    }

    /* Add any service that you want to be initialized after the server starts */
    private async PostServerInitialization(): Promise<void> {
        /* Initialize DB */
        MongooseProvider.DefaultConnection();

        /* Seed DB */
        if (Env.Database.SEED === true) {
            MongoSeed.Execute();
        }
    }

    public async Create(container: Container): Promise<ServerProvider> {

        await this.ConfigureServices();

        const expressServer = new InversifyExpressServer(container);

        expressServer.setConfig((app: express.Application) => {
            app.use(compression());
            app.use(cors({
                credentials: true,
                origin: Env.Server.CORS.split(',')
            }));
            app.use(express.json());
            app.use(morgan(MorganDefaultFormat(), {
                stream: MorganLog.Init(Env.Log.LOG_FOLDER) as rfs.RotatingFileStream
            }));
            app.use(express.urlencoded({ extended: true }));
            app.use(express.static('public'));
        });

        this.app = expressServer.build();

        return this;
    }

    public async Listen(port: any): Promise<void> {
        this.port = port;
        this.app.listen(this.port, async () => {
            this.consoleMessageProvider?.MessageServer(this.port);
            await this.PostServerInitialization();
        });
    }
}

const serverProvider: ServerProvider = new ServerProvider(new ConsoleMessageProvider());

export { serverProvider as ServerProvider };