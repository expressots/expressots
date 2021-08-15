import { controller, httpPatch, requestBody, requestParam, response } from "inversify-express-utils";
import { IUpdatePlayerDTO, IUpdatePlayerResponseDTO } from "./IUpdatePlayerDTO";
import { UpdatePlayerUseCase } from "./UpdatePlayerUseCase";

@controller('/player')
export class UpdatePlayerController {
    
    constructor(private updatePlayerUseCase: UpdatePlayerUseCase) {}

    @httpPatch('/:id')
    async execute(
        @requestParam('id') id: string,
        @requestBody() updatePlayerDTO: IUpdatePlayerDTO,
        @response() res): Promise<IUpdatePlayerResponseDTO> {
        try {
            const response = await this.updatePlayerUseCase.execute(id, updatePlayerDTO);
            return res.status(200).json(response);
        } catch (error: any) {
            return res.status(500).json(error);
        }
    }
}