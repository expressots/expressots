import "reflect-metadata";

import { BindingScopeEnum, interfaces } from "inversify";
import { AppFactory } from "../application";
import { provideSingleton } from "../decorator";
import { Logger } from "./logger/logger-service";

export interface IProvider {
  name: string;
  version: string;
  author: string;
  repo: string;
}

type ClassType<T> = new () => T;

@provideSingleton(ProviderManager)
export class ProviderManager {
  private container: interfaces.Container = AppFactory.container;
  private logger: Logger = new Logger();

  public register(
    serviceIdentifier: interfaces.ServiceIdentifier<unknown>,
    scope: interfaces.BindingScope = BindingScopeEnum.Request,
  ): void {
    if (this.container.isBound(serviceIdentifier)) {
      this.logger.warn(
        `${(serviceIdentifier as unknown as IProvider).name} already registered`,
        "provider-manager",
      );
      return;
    }

    switch (scope) {
      case BindingScopeEnum.Singleton:
        this.container.bind(serviceIdentifier).toSelf().inSingletonScope();
        break;
      case BindingScopeEnum.Transient:
        this.container.bind(serviceIdentifier).toSelf().inTransientScope();
        break;
      case BindingScopeEnum.Request:
        this.container.bind(serviceIdentifier).toSelf().inRequestScope();
        break;
    }
  }

  public get<P>(provider: ClassType<P>): P {
    const serviceIdentifier = this.container.get<P>(provider);

    if (!serviceIdentifier) {
      this.logger.error(`${provider.name} not registered`, "provider-manager");
      throw new Error(`Provider ${provider.name} not registered`);
    }
    return serviceIdentifier;
  }
}
