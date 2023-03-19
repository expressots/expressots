interface IDeleteMovieRequestDTO {
    id: number;
}

interface IDeleteMovieResponseDTO {
    id: number;
    status: string;
}

export { IDeleteMovieRequestDTO, IDeleteMovieResponseDTO };
