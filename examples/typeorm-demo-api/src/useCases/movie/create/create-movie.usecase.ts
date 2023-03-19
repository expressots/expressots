import { Movie } from "@entities/movie.entity";
import { MovieRepository } from "@repositories/movie.repository";
import { provide } from "inversify-binding-decorators";
import {
    ICreateMovieRequestDTO,
    ICreateMovieResponseDTO,
} from "./create-movie.dto";

@provide(CreateMovieUseCase)
class CreateMovieUseCase {
    constructor(private movieRepository: MovieRepository) {}

    execute(payload: ICreateMovieRequestDTO): ICreateMovieResponseDTO | null {
        try {
            const { title, year, genre } = payload;

            const movie: Movie = new Movie(title, year, genre);

            const isMovieExist = this.movieRepository.create(movie);

            let response: ICreateMovieResponseDTO;

            if (isMovieExist) {
                response = {
                    id: isMovieExist.id,
                    title: isMovieExist.title,
                    year: isMovieExist.year,
                    genre: isMovieExist.genre,
                    status: "Movie created successfully",
                };

                return response;
            }

            return null;
        } catch (error: any) {
            throw error;
        }
    }
}

export { CreateMovieUseCase };
