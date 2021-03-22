import { Request, Response } from "express";

export abstract class BaseController {

    /**
     * This is how the controller will handle the request passing the responsibility
     * to the use case to implement it. Make your implementation here...
     */
    protected abstract handleRequest(request: Request, response: Response): Promise<void | any>;

    /**
     * This is the function that will be hooked to the route handler 
     */

    public async execute(request: Request, response: Response): Promise<void> {

        try {
            await this.handleRequest(request, response);
        } catch (error) {
            console.log(`[BaseController]: Uncaught controller error`);
            console.log(error);
            this.fail
        }
    }

    /**
     * Helper response functions
     */

    public static jsonResponse (response: Response, code: number, message: string) {
        return response.status(code).json({ message });
    }
    
    public ok<T> (response: Response, dto?: T) {
        if (!!dto) {
          response.type('application/json');
          return response.status(200).json(dto);
        } else {
          return response.sendStatus(200);
        }
    }
    
    public created (response: Response) {
        return response.sendStatus(201);
    }
    
    public clientError (response: Response, message?: string) {
        return BaseController.jsonResponse(response, 400, message ? message : 'Unauthorized');
    }
    
    public unauthorized (response: Response, message?: string) {
        return BaseController.jsonResponse(response, 401, message ? message : 'Unauthorized');
    }
    
    public paymentRequired (response: Response, message?: string) {
        return BaseController.jsonResponse(response, 402, message ? message : 'Payment required');
    }
    
    public forbidden (response: Response, message?: string) {
        return BaseController.jsonResponse(response, 403, message ? message : 'Forbidden');
    }
    
    public notFound (response: Response, message?: string) {
        return BaseController.jsonResponse(response, 404, message ? message : 'Not found');
    }
    
    public conflict (response: Response, message?: string) {
        return BaseController.jsonResponse(response, 409, message ? message : 'Conflict');
    }
    
    public tooMany (response: Response, message?: string) {
        return BaseController.jsonResponse(response, 429, message ? message : 'Too many requests');
    }
    
    public todo (response: Response) {
        return BaseController.jsonResponse(response, 400, 'TODO');
    }
    
    public fail (response: Response, error: Error | string) {
        console.log(error);
        return response.status(500).json({message: error.toString()});
    }

}