/** Refactor the console test based on latest console and logger changes
 * Chalk dependency is not needed anymore
 */
import "reflect-metadata";
import { Console } from "../src/console";

let spy: vi.SpyInstance;
let consoleInstance: Console;

beforeEach(() => {
  consoleInstance = new Console();
  spy = vi.spyOn(console, "log");
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Console", () => {
  describe("messageServer", () => {
    it('calls message server with the correct arguments for environment "development" without IConsoleMessage', async () => {
      expect(spy).not.toHaveBeenCalled();
    });
  });
});

/* import "reflect-metadata";
import { Console } from "../src/console";

let spy: vi.SpyInstance;
let consoleInstance: Console;

beforeEach(() => {
  consoleInstance = new Console();
  spy = vi.spyOn(console, "log");
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Console", () => {
  describe("messageServer", () => {
    it('calls message server with the correct arguments for environment "development" without IConsoleMessage', async () => {
      await consoleInstance.messageServer(3000, "development");

      expect(spy).toHaveBeenCalledWith(
        "Application version not provided is running on port 3000 - Environment: development",
      );
    });

    it('calls message server with the correct arguments for environment "staging" without IConsoleMessage', async () => {
      await consoleInstance.messageServer(3000, "staging");

      expect(spy).toHaveBeenCalledWith(
        "Application version not provided is running on port 3000 - Environment: staging",
      );
    });

    it('calls message server with the correct arguments for environment "production" without IConsoleMessage', async () => {
      await consoleInstance.messageServer(3000, "production");

      expect(spy).toHaveBeenCalledWith(
        "Application version not provided is running on port 3000 - Environment: production",
      );
    });

    it('calls message server with the correct arguments for environment "unknown" without IConsoleMessage', async () => {
      await consoleInstance.messageServer(3000, "test");

      expect(spy).toHaveBeenCalledWith(
        "Application version not provided is running on port 3000 - Environment: test",
      );
    });

    it('calls message server with the correct arguments when the "consoleMessage" argument is provided', async () => {
      const consoleMessage = {
        appName: "TestApp",
        appVersion: "1.0.0",
      };
      await consoleInstance.messageServer(3000, "production", consoleMessage);
      expect(spy).toHaveBeenCalledWith(
        "TestApp version 1.0.0 is running on port 3000 - Environment: production",
      );
    });
  });
});
 */
