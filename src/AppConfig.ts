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

/**
 * This class is responsible to load the configuration file and to provide the configuration to the application.
 * @module appConfig - The configuration object.
*/


const expressServer = new InversifyExpressServer(container);
const fileStream: rfs.RotatingFileStream = MorganLog.Init(Env.Log.LOG_FOLDER) as rfs.RotatingFileStream;
const corsPath = Env.Server.CORS;

expressServer.setConfig((app: express.Application) => {
    app.use(compression());
    app.options(corsPath, app.use(cors())); // Review: Specify the correct address for communication
    app.use(express.json());
    app.use(morgan(MorganDefaultFormat(), { stream: fileStream }));
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static('public'));
});

const appConfig = expressServer.build();

export { appConfig };