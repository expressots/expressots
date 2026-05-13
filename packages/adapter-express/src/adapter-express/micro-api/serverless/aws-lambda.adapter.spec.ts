import type { Application } from "express";
import { awsLambdaAdapter, LambdaContext, LambdaEvent } from "./aws-lambda.adapter";

function makeContext(): LambdaContext {
  return {
    awsRequestId: "req-1",
    functionName: "fn",
    functionVersion: "1",
    invokedFunctionArn: "arn",
    memoryLimitInMB: "128",
    logGroupName: "lg",
    logStreamName: "ls",
    getRemainingTimeInMillis: () => 30000,
  };
}

describe("awsLambdaAdapter", () => {
  it("returns 200 with JSON body when the express handler responds via res.json", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expressApp = (req: any, res: any, _next: any) => {
      res.statusCode = 200;
      res.json({ hello: req.path });
    };

    const handler = awsLambdaAdapter(expressApp as unknown as Application);
    const event: LambdaEvent = {
      httpMethod: "GET",
      path: "/users",
    };

    const response = await handler(event, makeContext());

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(response.body)).toEqual({ hello: "/users" });
    expect(response.isBase64Encoded).toBe(false);
  });

  it("parses JSON request bodies before invoking the express app", async () => {
    let observedBody: unknown;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expressApp = (req: any, res: any, _next: any) => {
      observedBody = req.body;
      res.statusCode = 201;
      res.end();
    };

    const handler = awsLambdaAdapter(expressApp as unknown as Application);
    const event: LambdaEvent = {
      httpMethod: "POST",
      path: "/items",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "widget" }),
    };

    const response = await handler(event, makeContext());

    expect(observedBody).toEqual({ name: "widget" });
    expect(response.statusCode).toBe(201);
  });

  it("falls back to a 500 response when the express app throws", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expressApp = (_req: any, _res: any, _next: any) => {
      throw new Error("kaboom");
    };

    const handler = awsLambdaAdapter(expressApp as unknown as Application);
    const response = await handler({ httpMethod: "GET", path: "/" }, makeContext());

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({ error: "kaboom" });
  });

  it("accepts a wrapper exposing getExpressApp()", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expressApp = (_req: any, res: any, _next: any) => {
      res.statusCode = 200;
      res.end("ok");
    };
    const wrapper = { getExpressApp: () => expressApp };

    const handler = awsLambdaAdapter(
      wrapper as unknown as { getExpressApp?: () => Application },
    );
    const response = await handler({ httpMethod: "GET", path: "/" }, makeContext());

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("ok");
  });
});
