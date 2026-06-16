interface IFindOneMovieRequestDTO {
    id: number;
}

interface IFindOneMovieResponseDTO {
    id: number;
    title: string;
    genre: string;
    year: number;
}

export { IFindOneMovieResponseDTO, IFindOneMovieRequestDTO };
