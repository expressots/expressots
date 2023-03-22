import { MovieService } from "@/services";
import type { IMovie, IMovieForm } from "@/types";
import { defineStore } from "pinia";

interface IState {
  movies: Array<IMovie>;
}

const useMovieStore = defineStore("movie", {
  state: (): IState => ({
    movies: [],
  }),
  actions: {
    async add(movie: IMovieForm) {
      await MovieService.createMovie(movie);
    },
    async remove(movie_id: number) {
      await MovieService.deleteMovie(movie_id);
      this.loadMovies();
    },
    update(movie_id: number, payload: IMovieForm) {
      const index = this.movies.findIndex((movie) => movie.id === movie_id);

      if (index !== -1) {
        this.movies.splice(index, 1, {
          ...this.movies[index],
          ...payload,
        });
      }
    },
    async loadMovies() {
      const movies = await MovieService.getMovies();
      this.movies = movies.data;
    },
  },
});

export { useMovieStore };
