import "reflect-metadata";

import { Container } from "inversify";
import { describe, expect, it } from "vitest";
import { provide, provideSingleton, provideTransient } from "../scope-binding";

@provide()
class MyProvideService {
  public id = Math.random();
}

@provideSingleton()
class MySingletonService {
  public id = Math.random();
}

@provideTransient()
class MyTransient {
  public id = Math.random();
}

describe("scope binding definitions", () => {
  it("define a binding", () => {
    const container: Container = new Container();
    container.bind(MyProvideService).to(MyProvideService);

    const instance1 = container.get(MyProvideService);
    const instance2 = container.get(MyProvideService);
    expect(instance1.id).not.toBe(instance2.id);
  });

  it("define a singleton binding", () => {
    const container: Container = new Container();
    container
      .bind(MySingletonService)
      .to(MySingletonService)
      .inSingletonScope();

    const instance1 = container.get(MySingletonService);
    const instance2 = container.get(MySingletonService);
    expect(instance1.id).toBe(instance2.id);
  });

  it("define a transient binding", () => {
    const container: Container = new Container();
    container.bind(MyTransient).to(MyTransient).inTransientScope();

    const instance1 = container.get(MyTransient);
    const instance2 = container.get(MyTransient);
    expect(instance1.id).not.toBe(instance2.id);
  });
});
