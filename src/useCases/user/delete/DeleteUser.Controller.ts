import { controller, httpDelete, requestParam, response } from 'inversify-express-utils';
import { DeleteUserUseCase } from './DeleteUser.UseCase';
import { IDeleteResponseDTO } from './IDeleteUser.DTO';

import { BaseController } from '@providers/core/controller/Controller.Provider';
import { StatusCode } from '@providers/error/ErrorTypes';

@controller('/user')
export class DeleteUserController extends BaseController {

    constructor(private deleteUserUseCase: DeleteUserUseCase) {
        super("user-delete-controller");
    }

    @httpDelete('/delete/:id')
    async Execute(@requestParam("id") id: string, @response() res): Promise<IDeleteResponseDTO> {

        return this.CallUseCase(this.deleteUserUseCase.Execute({ id: id }), res, StatusCode.OK);
    }
}