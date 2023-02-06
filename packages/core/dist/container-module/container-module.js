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
var BaseModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateModule = void 0;
const inversify_1 = require("inversify");
const inversify_binding_decorators_1 = require("inversify-binding-decorators");
let BaseModule = BaseModule_1 = class BaseModule {
    constructor() { }
    static createSymbols(controllers) {
        const symbols = new Map();
        for (const controller of controllers) {
            const target = controller;
            const symbol = Symbol.for(target.name);
            symbols.set(symbol, target);
        }
        return symbols;
    }
    static createContainerModule(controllers) {
        const symbols = BaseModule_1.createSymbols(controllers);
        return new inversify_1.ContainerModule(bind => {
            for (const symbol of symbols) {
                const target = symbol.valueOf();
                bind(target[0]).to(target[1]);
            }
        });
    }
};
BaseModule = BaseModule_1 = __decorate([
    (0, inversify_binding_decorators_1.provide)(BaseModule_1),
    __metadata("design:paramtypes", [])
], BaseModule);
const CreateModule = BaseModule.createContainerModule;
exports.CreateModule = CreateModule;
//# sourceMappingURL=container-module.js.map