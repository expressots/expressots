import express from 'express';
const compression = require('compression');
import { router } from './router';

// initialize express
const app = express();

// add middlewares
app.use(compression());
app.use(express.json());
app.use(router);

export { app };