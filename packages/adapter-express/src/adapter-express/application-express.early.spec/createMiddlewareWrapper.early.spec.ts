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
