import { provide } from "inversify-binding-decorators";
import { PingResponseDTO } from "./ping.dto";

@provide(PingUseCase)
class PingUseCase {
  execute(): PingResponseDTO {
    const response: PingResponseDTO = {
      message: "API is Online",
    };

    return response;
  }
}

export { PingUseCase };
