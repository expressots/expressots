import { describe, it, expect } from "vitest";
import { StatusCode } from "../status-code";

// Function to categorize status codes
function categorizeStatusCode(code: number): string {
  if (code >= 100 && code < 200) {
    return "Informational";
  } else if (code >= 200 && code < 300) {
    return "Success";
  } else if (code >= 300 && code < 400) {
    return "Redirection";
  } else if (code >= 400 && code < 500) {
    return "Client Error";
  } else if (code >= 500 && code < 600) {
    return "Server Error";
  }
  return "Unknown";
}

describe("categorize StatusCode", () => {
  it("correctly categorizes informational status codes", () => {
    expect(categorizeStatusCode(StatusCode.Continue)).toBe("Informational");
    expect(categorizeStatusCode(StatusCode.SwitchingProtocols)).toBe(
      "Informational",
    );
  });

  it("correctly categorizes success status codes", () => {
    expect(categorizeStatusCode(StatusCode.OK)).toBe("Success");
    expect(categorizeStatusCode(StatusCode.Created)).toBe("Success");
  });
});
