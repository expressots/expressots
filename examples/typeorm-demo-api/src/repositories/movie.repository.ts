import { Movie } from "@entities/movie.entity";
import { BaseRepository } from "@repositories/base-repository";
import { provide } from "inversify-binding-decorators";

@provide(MovieRepository)
class MovieRepository extends BaseRepository<Movie> {
    constructor() {
        super();
        this.entityClass = Movie;
    }
}

export { MovieRepository };
