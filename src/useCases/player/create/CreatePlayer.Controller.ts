import { Request, Response } from "express";
import { CreatePlayerUseCase } from "./CreatePlayer.UseCase";

export class CreatePlayerController {
    
    constructor(private createPlayerUseCase: CreatePlayerUseCase) {}

    async handleRequest(request: Request, response: Response): Promise<Response> {

        const { name, email, faction } = request.body;

        try {
            await this.createPlayerUseCase.execute({name, email, faction});
            return response.status(201).send();
        } catch (error) {
            return response.status(400).json({errorMessage: error.message || 'Internal server error!'});
        }
    }
}