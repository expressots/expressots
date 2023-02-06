"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var Console_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Console = void 0;
const chalk_1 = __importDefault(require("chalk"));
const inversify_binding_decorators_1 = require("inversify-binding-decorators");
var ColorStyle;
(function (ColorStyle) {
    ColorStyle[ColorStyle["None"] = 0] = "None";
    ColorStyle[ColorStyle["Yellow"] = 1] = "Yellow";
    ColorStyle[ColorStyle["Blue"] = 2] = "Blue";
    ColorStyle[ColorStyle["Green"] = 3] = "Green";
    ColorStyle[ColorStyle["Red"] = 4] = "Red";
})(ColorStyle || (ColorStyle = {}));
let Console = Console_1 = class Console {
    async printColor(message, colorStyle) {
        switch (colorStyle) {
            case ColorStyle.Yellow:
                return console.log(chalk_1.default.bgYellow.black(message));
            case ColorStyle.Blue:
                return console.log(chalk_1.default.bgBlue.black(message));
            case ColorStyle.Green:
                return console.log(chalk_1.default.bgGreen.black(message));
            case ColorStyle.Red:
                return console.log(chalk_1.default.bgRed.black(message));
        }
    }
    async messageServer(port, env) {
        const appConsoleMessage = {
            appName: env.Application.APP_NAME || "Expressots",
            appVersion: env.Application.APP_VERSION || "1.0.0",
            timezone: env.Application.TIMEZONE || "UTC",
            adminEmail: env.Application.ADMIN_EMAIL || "dev@expresso-ts.com",
            language: env.Application.LANGUAGE || "en",
            environment: env.Application.ENVIRONMENT || "development",
            https: env.Application.HTTPS || false,
            port: port
        };
        let terminalColor = ColorStyle.None;
        switch (env.Application.ENVIRONMENT.toLowerCase()) {
            case "development":
                terminalColor = ColorStyle.Yellow;
                break;
            case "staging":
                terminalColor = ColorStyle.Blue;
                break;
            case "production":
                terminalColor = ColorStyle.Green;
                break;
            default:
                terminalColor = ColorStyle.Red;
                break;
        }
        let securePortCheck = env.Application.HTTPS ? "Secure HTTPS" : "Non-Secure HTTP";
        this.printColor(`${appConsoleMessage.appName} version ${appConsoleMessage.appVersion} is running on a ` +
            `${securePortCheck} port ${appConsoleMessage.port} - Environment: ${appConsoleMessage.environment}`, terminalColor);
    }
};
Console = Console_1 = __decorate([
    (0, inversify_binding_decorators_1.provide)(Console_1)
], Console);
exports.Console = Console;
//# sourceMappingURL=console.js.map