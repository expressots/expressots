interface IUserUpdateRequestDTO {
    name?: string;
    email: string;
}

interface IUserUpdateResponseDTO {
    id: string;
    name: string;
    email: string;
    message: string;
}

export { IUserUpdateRequestDTO, IUserUpdateResponseDTO };
