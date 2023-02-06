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
var AppContainer_1;
Object.defineProperty(exports, "__esModule", { value: true });
const inversify_1 = require("inversify");
const inversify_binding_decorators_1 = require("inversify-binding-decorators");
let AppContainer = AppContainer_1 = class AppContainer {
    constructor() { }
    create(modules) {
        this.container = new inversify_1.Container();
        this.container.load(...modules);
        return this;
    }
};
AppContainer = AppContainer_1 = __decorate([
    (0, inversify_binding_decorators_1.provide)(AppContainer_1),
    __metadata("design:paramtypes", [])
], AppContainer);
exports.default = AppContainer;
//# sourceMappingURL=appContainer.js.map