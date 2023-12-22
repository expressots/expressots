interface ICreateUserRequestDTO {
    name: string;
    email: string;
}

interface ICreateUserResponseDTO {
    id: string;
    name: string;
    email: string;
    message: string;
}

export { ICreateUserRequestDTO, ICreateUserResponseDTO };
