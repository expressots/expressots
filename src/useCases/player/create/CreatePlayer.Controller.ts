import { CreatePlayerUseCase} from "./CreatePlayer.UseCase";
import { controller, httpPost, interfaces, requestBody } from "inversify-express-utils";
import { ICreatePlayerDTO, ICreatePlayerReturn } from "./ICreatePlayer.DTO";
import { Player } from "@entities/Player";


@controller('/player/create')
export class CreatePlayerController implements interfaces.Controller {
    
    constructor(private createPlayerUseCase: CreatePlayerUseCase) { }
      
    @httpPost('/')
    async execute(@requestBody() data: ICreatePlayerDTO): Promise<ICreatePlayerReturn> {
        try {
            return await this.createPlayerUseCase.execute(data);
        } catch (error: any) {
            throw new Error(error);(error || 'Internal server error!');
        }
    }   
}