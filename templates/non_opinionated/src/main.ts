import { AppFactory } from "@expressots/core";
import { App } from "app";

AppFactory.create(App).then((app) => app.listen(3000));