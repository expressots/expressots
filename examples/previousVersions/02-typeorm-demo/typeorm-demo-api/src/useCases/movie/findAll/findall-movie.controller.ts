import { BaseController, StatusCode } from "@expressots/core";
import { controller, httpGet, response } from "inversify-express-utils";
import { IFindAllMovieResponseDTO } from "./findall-movie.dto";
import { FindAllMovieUseCase } from "./findall-movie.usecase";

@controller("/movies")
class FindAllMovieController extends BaseController {
    constructor(private findallMovieUseCase: FindAllMovieUseCase) {
        super("findall-movie-controller");
    }

    @httpGet("/")
    async execute(@response() res: any): Promise<IFindAllMovieResponseDTO[]> {
        return this.callUseCaseAsync(
            this.findallMovieUseCase.execute(),
            res,
            StatusCode.OK,
        );
    }
}

export { FindAllMovieController };
