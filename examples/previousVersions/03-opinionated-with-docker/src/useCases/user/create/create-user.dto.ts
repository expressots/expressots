interface ICreateUserRequestDTO {
    name: string;
    email: string;
}

interface ICreateUserResponseDTO {
    id: string;
    name: string;
    email: string;
    status: string;
}

export { ICreateUserRequestDTO, ICreateUserResponseDTO };
