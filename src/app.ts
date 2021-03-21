import express from 'express';
import { router } from './router';

// initialize express
const app = express();

// add middlewares
app.use(express.json());
app.use(router);

export { app };