import { Env } from 'env';
import express from "express";
import cors from "cors";
import morgan from "morgan";
import compression from "compression";
import rfs from "rotating-file-stream";
import { InversifyExpressServer } from "inversify-express-utils";
import { container } from "@providers/inversify/Container.Provider";
import { MorganLog } from "@providers/logger/morgan/MorganLog.Provider";
import { MorganDefaultFormat } from "@providers/logger/morgan/MorganTokens";
import { Environments } from '@providers/envValidator/EnvValidator.Provider';

/**
 * This class is responsible to load the configuration file and to provide the configuration to the application.
 * @module appConfig - The configuration object.
*/


/* Check if .env file exists and all environment variables are defined */
Environments.CheckAll();

const expressServer = new InversifyExpressServer(container);
const fileStream: rfs.RotatingFileStream = MorganLog.Init(Env.Log.LOG_FOLDER) as rfs.RotatingFileStream;
const corsPath: string[] = Env.Server.CORS.split(',');

expressServer.setConfig((app: express.Application) => {
    app.use(compression());
    app.use(cors({ credentials: true, origin: corsPath }));
    app.use(express.json());
    app.use(morgan(MorganDefaultFormat(), { stream: fileStream }));
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static('public'));
});

const appConfig = expressServer.build();

export { appConfig };