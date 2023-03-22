import type { IMovie, IMovieForm } from "@/types";
import api from "./api";

function createMovie(payload: IMovieForm) {
  return api.post("/movie/create", payload);
}

function deleteMovie(id: number) {
  return api.del(`/movie/${id}`);
}

function getMovies() {
  return api.get<IMovie[]>("/movies");
}

function getMovie(id: number) {
  return api.get<IMovie>(`/movie/${id}`);
}

export default { createMovie, deleteMovie, getMovies, getMovie };
