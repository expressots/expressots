import { CreateModule } from '@expressots/core';
import { DefaultRouterController } from './default-route';

const BaseRouterContainerModule = CreateModule([
    // Add your modules here
    DefaultRouterController
]);

export { BaseRouterContainerModule };