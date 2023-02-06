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
        var _a, _b, _c, _d, _e, _f, _g;
        const appConsoleMessage = {
            appName: ((_a = env === null || env === void 0 ? void 0 : env.Application) === null || _a === void 0 ? void 0 : _a.APP_NAME) || "Expressots",
            appVersion: ((_b = env === null || env === void 0 ? void 0 : env.Application) === null || _b === void 0 ? void 0 : _b.APP_VERSION) || "1.0.0",
            timezone: ((_c = env === null || env === void 0 ? void 0 : env.Application) === null || _c === void 0 ? void 0 : _c.TIMEZONE) || "UTC",
            adminEmail: ((_d = env === null || env === void 0 ? void 0 : env.Application) === null || _d === void 0 ? void 0 : _d.ADMIN_EMAIL) || "dev@expresso-ts.com",
            language: ((_e = env === null || env === void 0 ? void 0 : env.Application) === null || _e === void 0 ? void 0 : _e.LANGUAGE) || "en",
            environment: ((_f = env === null || env === void 0 ? void 0 : env.Application) === null || _f === void 0 ? void 0 : _f.ENVIRONMENT) || "development",
            https: ((_g = env === null || env === void 0 ? void 0 : env.Application) === null || _g === void 0 ? void 0 : _g.HTTPS) || false,
            port: port
        };
        let terminalColor = ColorStyle.None;
        switch (appConsoleMessage.environment.toLowerCase()) {
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
        let securePortCheck = appConsoleMessage.https ? "Secure HTTPS" : "Non-Secure HTTP";
        this.printColor(`${appConsoleMessage.appName} version ${appConsoleMessage.appVersion} is running on a ` +
            `${securePortCheck} port ${appConsoleMessage.port} - Environment: ${appConsoleMessage.environment}`, terminalColor);
    }
};
Console = Console_1 = __decorate([
    (0, inversify_binding_decorators_1.provide)(Console_1)
], Console);
exports.Console = Console;
//# sourceMappingURL=console.js.map