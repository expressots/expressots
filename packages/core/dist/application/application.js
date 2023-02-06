"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var Application_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Application = exports.AppInstance = void 0;
require("reflect-metadata");
const inversify_binding_decorators_1 = require("inversify-binding-decorators");
const inversify_express_utils_1 = require("inversify-express-utils");
const console_1 = require("../console/console");
let Application = Application_1 = class Application {
    constructor() { }
    /* Add any service that you want to be initialized before the server starts */
    configureServices() {
    }
    /* Add any service that you want to execute after the server starts */
    postServerInitialization() { }
    /* Add any service that you want to execute after server is shutdown */
    serverShutdown() {
        /* Replace this console by the Log system */
        console.log("Server is shutting down");
        process.exit(0);
    }
    create(container, middlewares = []) {
        this.configureServices();
        const expressServer = new inversify_express_utils_1.InversifyExpressServer(container);
        expressServer.setConfig((app) => {
            middlewares.forEach(middleware => {
                app.use(middleware);
            });
        });
        this.app = expressServer.build();
        return this;
    }
    listen(port, env) {
        this.port = port;
        this.app.listen(this.port, () => {
            new console_1.Console().messageServer(this.port, env || {});
            /* Shutdown the API */
            process.on("SIGINT", this.serverShutdown);
        });
        this.postServerInitialization();
    }
};
Application = Application_1 = __decorate([
    (0, inversify_binding_decorators_1.provide)(Application_1),
    __metadata("design:paramtypes", [])
], Application);
exports.Application = Application;
const appServerInstance = new Application();
exports.AppInstance = appServerInstance;
//# sourceMappingURL=application.js.map