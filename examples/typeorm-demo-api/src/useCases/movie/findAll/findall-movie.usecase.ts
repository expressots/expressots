import { MovieRepository } from "@repositories/movie.repository";
import { provide } from "inversify-binding-decorators";
import { IFindAllMovieResponseDTO } from "./findall-movie.dto";

@provide(FindAllMovieUseCase)
class FindAllMovieUseCase {
    constructor(private movieRepository: MovieRepository) {}

    async execute(): Promise<IFindAllMovieResponseDTO[] | null> {
        try {
            const movies = await this.movieRepository.findAll();
            const moviesMapped: IFindAllMovieResponseDTO[] = [];

            movies.forEach((movie) => {
                moviesMapped.push({
                    id: movie.id,
                    title: movie.title,
                    genre: movie.genre,
                    year: movie.year,
                });
            });

            return moviesMapped;
        } catch (error: any) {
            throw error;
        }
    }
}

export { FindAllMovieUseCase };
