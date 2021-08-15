import { Player } from "@entities/Player";
import { controller, httpGet, interfaces, response } from "inversify-express-utils";
import { FindAllPlayersUseCase } from "./FindAllPlayersUseCase";
import { IFindAllPlayersDTO } from "./IFindAllPlayersDTO";

@controller('/players')
export class FindAllPlayersController implements interfaces.Controller {
    
    constructor(private findAllUseCase: FindAllPlayersUseCase) { }

    @httpGet('/')
    async execute(@response() res): Promise<IFindAllPlayersDTO> {

        try {
            const players = await this.findAllUseCase.execute();
            return res.status(200).json(players);
        } catch (error: any) {
            throw new Error(error);(error || 'Internal server error!');
        }

    }
}