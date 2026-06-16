/**
 * Interface representing application message details for console output.
 * @public API
 */
export interface IConsoleMessage {
  appName: string;
  appVersion: string;
  apiVersions?: Array<string>; // Optional array of API versions detected from @Version() decorators
  /** CI environment detection info (for bootstrap logging) */
  ciDetection?: {
    detected: boolean;
    platform?: string;
  };
}
