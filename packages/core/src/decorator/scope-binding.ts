import { fluentProvide } from "inversify-binding-decorators";

const provideSingleton = (identifier: any) => {
  return fluentProvide(identifier).inSingletonScope().done();
};

const provideTransient = (identifier: any) => {
  return fluentProvide(identifier).inTransientScope().done();
};

export { provideSingleton, provideTransient };
