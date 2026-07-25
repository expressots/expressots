import "reflect-metadata";
import { PingUseCase } from "@useCases/ping/ping.usecase";

describe("PingUseCase", () => {
  let pingUseCase: PingUseCase;

  beforeEach(() => {
    pingUseCase = new PingUseCase();
  });

  it("should return a valid PingResponseDTO", () => {
    const start: Date = new Date();
    const response = pingUseCase.execute(start);
    const end: Date = new Date(response.end);
    const ttl = parseFloat(response.ttl.split(" ")[0]);

    expect(response).toHaveProperty("start");
    expect(response).toHaveProperty("end");
    expect(response).toHaveProperty("ttl");
    expect(response).toHaveProperty("message");
    expect(response.message).toBe("Pong!");
    expect(start <= end).toBe(true);
    expect(ttl >= 0).toBe(true);
  });
});
