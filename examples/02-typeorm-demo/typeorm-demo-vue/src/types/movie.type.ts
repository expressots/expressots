export interface IMovie {
  id: number;
  title: string;
  year: number;
  genre: string;
}

export type IMovieForm = Omit<IMovie, "id">;
