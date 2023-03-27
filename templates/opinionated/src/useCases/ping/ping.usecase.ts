import { provide } from "inversify-binding-decorators";
import { PingResponseDTO } from "./ping.dto";

@provide(PingUseCase)
class PingUseCase {
    execute(start: Date): PingResponseDTO {
        const end: Date = new Date();
        const timeToRespond: number = end.getTime() - start.getTime();
        const ttl: number = timeToRespond / 1000;

        const format = (d: Date) => {
            return d.toISOString().replace(/T/, " ").replace(/\..+/, "");
        };

        const response: PingResponseDTO = {
            start: format(start),
            end: format(end),
            ttl: `${ttl.toFixed(2)} sec`,
            message: "Pong!",
        };

        return response;
    }
}

export { PingUseCase };
