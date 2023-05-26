interface IUserDeleteRequestDTO {
    id: string;
}

interface IUserDeleteResponseDTO {
    name: string;
    email: string;
    message: string;
}

export { IUserDeleteRequestDTO, IUserDeleteResponseDTO };
