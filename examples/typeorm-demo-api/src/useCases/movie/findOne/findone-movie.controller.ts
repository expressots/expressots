import { BaseController, StatusCode } from "@expressots/core";
import {
    controller,
    httpGet,
    requestParam,
    response,
} from "inversify-express-utils";
import {
    IFindOneMovieRequestDTO,
    IFindOneMovieResponseDTO,
} from "./findone-movie.dto";
import { FindOneMovieUseCase } from "./findone-movie.usecase";

@controller("/movie")
class FindOneMovieController extends BaseController {
    constructor(private findoneMovieUseCase: FindOneMovieUseCase) {
        super("findone-movie-controller");
    }

    @httpGet("/:id")
    async execute(
        @requestParam() id: IFindOneMovieRequestDTO,
        @response() res: any,
    ): Promise<IFindOneMovieResponseDTO> {
        return this.callUseCaseAsync(
            this.findoneMovieUseCase.execute(id),
            res,
            StatusCode.OK,
        );
    }
}

export { FindOneMovieController };
