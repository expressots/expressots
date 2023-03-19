import { MovieRepository } from "@repositories/movie.repository";
import { provide } from "inversify-binding-decorators";
import {
    IDeleteMovieRequestDTO,
    IDeleteMovieResponseDTO,
} from "./delete-movie.dto";

@provide(DeleteMovieUseCase)
class DeleteMovieUseCase {
    constructor(private movieRepository: MovieRepository) {}

    async execute(
        payload: IDeleteMovieRequestDTO,
    ): Promise<IDeleteMovieResponseDTO | null> {
        try {
            const movie = await this.movieRepository.find(payload.id);

            if (movie) {
                await this.movieRepository.delete(payload.id);
            }

            if (movie) {
                return {
                    id: payload.id,
                    status: `Movie id: ${payload.id} deleted successfully`,
                };
            }

            return null;
        } catch (error: any) {
            throw error;
        }
    }
}

export { DeleteMovieUseCase };
