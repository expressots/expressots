import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { InversifyExpressServer } from 'inversify-express-utils';
import { container } from '@providers/inversify/Container';
const compression = require('compression');

const expressServer = new InversifyExpressServer(container);

expressServer.setConfig((app: express.Application) => {
    app.use(compression());
    app.options('*', app.use(cors())); // Review: To test cors
    app.use(express.json());
    app.use(morgan('dev'));
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static('public'));
}); 

const app = expressServer.build();

export { app };