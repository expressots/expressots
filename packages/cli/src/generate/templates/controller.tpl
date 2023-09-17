import { BaseController } from "@expressots/core";
import { controller, {{method}} } from "@expressots/adapter-express";

@controller("/{{{route}}}")
export class {{className}}Controller extends BaseController {
    @{{method}}("/")
    execute() {
        return "Ok";
    }
}
