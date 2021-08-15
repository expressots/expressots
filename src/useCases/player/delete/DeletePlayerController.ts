import { controller, httpDelete, requestParam, response } from "inversify-express-utils";
import { DeletePlayerUseCase } from "./DeletePlayerUseCase";
import { IDeletePlayerDTO } from "./IDeletePlayerDTO";

@controller('/player')
export class DeletePlayerController {
    
    constructor(private deletePlayerUseCase: DeletePlayerUseCase) {}

    @httpDelete('/:id')
    async execute(@requestParam('id') id: string, @response() res) : Promise<IDeletePlayerDTO> {
        try {
            console.log("DeletePlayerController.execute");
            const confirmation:IDeletePlayerDTO = await this.deletePlayerUseCase.execute(id) as IDeletePlayerDTO;
            return res.status(200).json(confirmation);
        } catch (error: any) {
            throw new Error(error);(error || 'Internal server error!');
        }
    }
}