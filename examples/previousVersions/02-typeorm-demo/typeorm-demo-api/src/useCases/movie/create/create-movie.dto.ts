interface ICreateMovieRequestDTO {
    title: string;
    year: number;
    genre: string;
}

interface ICreateMovieResponseDTO {
    id: number | string;
    title: string;
    genre: string;
    year: number;
    status: string;
}

export { ICreateMovieRequestDTO, ICreateMovieResponseDTO };
