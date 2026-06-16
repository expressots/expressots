interface IDeleteRequestDTO {
    id: string;
}

interface IDeleteResponseDTO {
    id: string;
    name: string;
    email: string;
    status: string;
}

export { IDeleteRequestDTO, IDeleteResponseDTO };