import { BaseController } from "@expressots/core";
import { controller, {{method}} } from "@expressots/adapter-express";

@controller("/{{{route}}}")
export class {{className}}{{schematic}} {
    @{{method}}("/")
    execute() {
        return "{{schematic}}";
    }
}
