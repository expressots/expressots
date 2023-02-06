"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.container = void 0;
const core_1 = require("@expressots/core/");
const appContainer = new core_1.AppContainer();
const container = appContainer.create([
// Add your modules here
]);
exports.container = container;
//# sourceMappingURL=appContainer.js.map