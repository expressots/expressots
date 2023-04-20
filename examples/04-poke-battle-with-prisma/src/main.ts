import "reflect-metadata";

import { App } from "@providers/application/application";
import { container } from "app-container";
import { ServerEnvironment } from "@expressots/core";
import ENV from "./env";
import express from "express";
import compression from "compression";

async function Bootstrap() {
  const app = App.create(container, [
    express.json({ limit: "50mb" }),
    compression(),
  ]);
  app.listen(
    ENV.Application.PORT,
    ServerEnvironment[ENV.Application.ENVIRONMENT],
    {
      appName: ENV.Application.APP_NAME,
      appVersion: ENV.Application.APP_VERSION,
    },
  );
}

Bootstrap();
