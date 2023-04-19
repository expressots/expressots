import { fluentProvide } from "inversify-binding-decorators";

export const provideSingleton = (identifier: any) => {
    return fluentProvide(identifier).inSingletonScope().done();
};
