import { BaseController, StatusCode } from "@expressots/core";
import {
    controller,
    httpPost,
    requestBody,
    response,
} from "inversify-express-utils";
import {
    ICreateMovieRequestDTO,
    ICreateMovieResponseDTO,
} from "./create-movie.dto";
import { CreateMovieUseCase } from "./create-movie.usecase";

@controller("/movie/create")
class CreateMovieController extends BaseController {
    constructor(private createMovieUseCase: CreateMovieUseCase) {
        super("create-movie-controller");
    }

    @httpPost("/")
    execute(
        @requestBody() payload: ICreateMovieRequestDTO,
        @response() res: any,
    ): ICreateMovieResponseDTO {
        return this.callUseCase(
            this.createMovieUseCase.execute(payload),
            res,
            StatusCode.Created,
        );
    }
}

export { CreateMovieController };
