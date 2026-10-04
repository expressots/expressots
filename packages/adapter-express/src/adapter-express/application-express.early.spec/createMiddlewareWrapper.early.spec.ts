import { getHttpContext } from "../express-utils/http-context-store";
import { AppExpress } from "../application-express";

describe("AppExpress.createMiddlewareWrapper() method", () => {
  it("injects the container when exception filters are enabled", () => {
    const appExpress = new AppExpress() as AppExpress;
    const container = { id: "container" };
    const setErrorHandler = jest.fn();

    (appExpress as unknown as { appContainer: { Container: unknown } }).appContainer = {
      Container: container,
    };
    (
      appExpress as unknown as { middlewareManager: { setErrorHandler: jest.Mock } }
    ).middlewareManager = {
      setErrorHandler,
    };

    const wrapper = (
      appExpress as unknown as {
        createMiddlewareWrapper: (base: { setErrorHandler: jest.Mock }) => {
          setErrorHandler: (options?: {
            enableExceptionFilters?: boolean;
            container?: unknown;
          }) => void;
        };
      }
    ).createMiddlewareWrapper({ setErrorHandler });

    wrapper.setErrorHandler({ enableExceptionFilters: true });

    expect(setErrorHandler).toHaveBeenCalledWith(expect.objectContaining({ container }));
  });

  it("forwards the application container and request context accessor to JWT sessions", () => {
    const app = new AppExpress();
    const container = { id: "jwt-container" };
    (app as unknown as { appContainer: { Container: unknown } }).appContainer = {
      Container: container,
    };
    const session = jest.fn();
    const base = { session };
    const wrapper = (
      app as unknown as { createMiddlewareWrapper: (middleware: typeof base) => typeof base }
    ).createMiddlewareWrapper(base);
    wrapper.session({ type: "jwt" });
    expect(session).toHaveBeenCalledWith({ type: "jwt" }, container, getHttpContext);
  });

  it("forwards unrelated middleware properties through the proxy", () => {
    const appExpress = new AppExpress() as AppExpress;
    const getMiddlewarePipeline = jest.fn().mockReturnValue(["pipeline"]);
    const base = { setErrorHandler: jest.fn(), getMiddlewarePipeline };

    const wrapper = (
      appExpress as unknown as {
        createMiddlewareWrapper: (middleware: typeof base) => typeof base;
      }
    ).createMiddlewareWrapper(base);

    expect(wrapper.getMiddlewarePipeline()).toEqual(["pipeline"]);
  });
});
