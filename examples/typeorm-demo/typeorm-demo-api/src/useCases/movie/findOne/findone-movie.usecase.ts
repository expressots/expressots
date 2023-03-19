import { MovieRepository } from "@repositories/movie.repository";
import { provide } from "inversify-binding-decorators";
import {
    IFindOneMovieRequestDTO,
    IFindOneMovieResponseDTO,
} from "./findone-movie.dto";

@provide(FindOneMovieUseCase)
class FindOneMovieUseCase {
    constructor(private movieRepository: MovieRepository) {}

    async execute(
        payload: IFindOneMovieRequestDTO,
    ): Promise<IFindOneMovieResponseDTO | null> {
        try {
            const movie = await this.movieRepository.find(payload.id);

            if (movie) {
                return {
                    id: movie.id,
                    title: movie.title,
                    genre: movie.genre,
                    year: movie.year,
                };
            }

            return null;
        } catch (error: any) {
            throw error;
        }
    }
}

export { FindOneMovieUseCase };
