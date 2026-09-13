import { AppFactory } from "./removed-apis";
import { AppFactory as PublicAppFactory } from "../index";

// ts-jest reports type errors, so an unused expect-error directive fails
// the suite: the lines below assert that v3 call shapes do not compile.
class App {}
const container = {};

// @ts-expect-error v3 signature: AppFactory.create(container, AppModule)
void (() => AppFactory.create(container, App));
// @ts-expect-error v4-preview signature: AppFactory.create(App)
void (() => AppFactory.create(App));

describe("AppFactory tombstone", () => {
  it("is exported from the package root so the import resolves", () => {
    expect(PublicAppFactory).toBe(AppFactory);
  });

  it("throws the migration message at runtime", () => {
    const call = () =>
      (AppFactory.create as (...args: Array<unknown>) => never)({}, App);
    expect(call).toThrow(/AppFactory was removed in ExpressoTS v4/);
    expect(call).toThrow(/await bootstrap\(App\)/);
    expect(call).toThrow(/doc\.expresso-ts\.com/);
  });

  it("is frozen so it cannot be patched back into a working factory", () => {
    expect(Object.isFrozen(AppFactory)).toBe(true);
  });
});
