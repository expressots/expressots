interface IUserFindRequestDTO {
    email: string;
}

interface IUserFindResponseDTO {
    id: string;
    name: string;
    email: string;
    message: string;
}

export { IUserFindRequestDTO, IUserFindResponseDTO };
