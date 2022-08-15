/**
 * This class is responsible to load the configuration file and to provide the configuration to the application.
 * @module appConfig - The configuration object.
*/
import express from "express";
import cors from "cors";
import morgan from "morgan";
import compression from "compression";
import rfs from "rotating-file-stream";
import { InversifyExpressServer } from "inversify-express-utils";
import { container } from "@providers/inversify/Container.Provider";
import { Log } from "@providers/logger/Log.Provider";

const expressServer = new InversifyExpressServer(container);
const fileStream: rfs.RotatingFileStream = Log.Init(__dirname) as rfs.RotatingFileStream;

expressServer.setConfig((app: express.Application) => {
    app.use(compression());
    app.options('*', app.use(cors())); // Review: Specify the correct address for communication
    app.use(express.json());
    app.use(morgan("combined", { stream: fileStream }));
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static('public'));
});

const appConfig = expressServer.build();

export { appConfig };