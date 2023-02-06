import "reflect-metadata";
import express from "express";
import { Container } from "inversify";
import { IEnv } from "./ienv";
declare class Application {
    private app;
    private port;
    constructor();
    protected configureServices(): void;
    protected postServerInitialization(): void;
    protected serverShutdown(): void;
    create(container: Container, middlewares?: express.RequestHandler[]): Application;
    listen(port: any, env?: IEnv): void;
}
declare const appServerInstance: Application;
export { appServerInstance as AppInstance, Application };
