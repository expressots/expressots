import { controller, httpGet, requestParam, response } from "inversify-express-utils";
import { FindPlayerUseCase } from "./FindPlayerUseCase";
import { IFindPlayerDTO } from "./IFindPlayerDTO";

@controller('/player')
export class FindPlayerController {
    
    constructor(private findOnePlayerUseCase: FindPlayerUseCase) {}

    @httpGet('/:id')
    async execute(@requestParam('id') id: string, @response() res): Promise<IFindPlayerDTO> {
        try{
            const player = await this.findOnePlayerUseCase.execute(id);
            return res.status(200).json(player);
        } catch (error: any) {
            throw new Error(error);(error || 'Internal server error!');
        }
    }
}