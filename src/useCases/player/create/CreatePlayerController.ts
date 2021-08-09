import { Request, Response } from "express";
import { BaseController } from "@providers/controller/BaseController";
import { CreatePlayerUseCase } from "./CreatePlayerUseCase";

export class CreatePlayerController extends BaseController {
    
    constructor(private createPlayerUseCase: CreatePlayerUseCase) {
        super();
    }
    
    async implement(request: Request, response: Response): Promise<Response> {

        const { name, email, faction } = request.body;

        try {
            await this.createPlayerUseCase.execute({name, email, faction});
            return  this.created(response); 
        } catch (error: any) {
            return this.fail(response, error || 'Internal server error!');
        }
    }   
}