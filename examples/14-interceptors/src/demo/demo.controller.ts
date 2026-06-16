import { controller, Get } from "@expressots/adapter-express";
import { UseInterceptors } from "@expressots/core";
import { LoggingInterceptor } from "../interceptors/logging.interceptor";
import { TimingInterceptor } from "../interceptors/timing.interceptor";

@controller("/")
@UseInterceptors(LoggingInterceptor, TimingInterceptor)
export class DemoController {
    @Get("/demo")
    demo() {
        return {
            message: "Interceptor demo",
            example: "14-interceptors",
            docs: "https://doc.expresso-ts.com/docs/features/interceptors",
        };
    }
}
