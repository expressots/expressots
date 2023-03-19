import { BaseController, StatusCode } from "@expressots/core";
import {
    controller,
    httpDelete,
    requestParam,
    response,
} from "inversify-express-utils";
import {
    IDeleteMovieRequestDTO,
    IDeleteMovieResponseDTO,
} from "./delete-movie.dto";
import { DeleteMovieUseCase } from "./delete-movie.usecase";

@controller("/movie")
class DeleteMovieController extends BaseController {
    constructor(private deleteMovieUseCase: DeleteMovieUseCase) {
        super("delete-movie-controller");
    }

    @httpDelete("/:id")
    async execute(
        @requestParam() id: IDeleteMovieRequestDTO,
        @response() res: any,
    ): Promise<IDeleteMovieResponseDTO> {
        return this.callUseCaseAsync(
            this.deleteMovieUseCase.execute(id),
            res,
            StatusCode.OK,
        );
    }
}

export { DeleteMovieController };
