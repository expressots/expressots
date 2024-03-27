import { BaseController } from "@expressots/core";
import { controller, {{method}} } from "@expressots/adapter-express";

@controller("/{{{route}}}")
export class {{className}}Controller {
    @{{method}}("/")
    execute() {
        return "Ok";
    }
}
