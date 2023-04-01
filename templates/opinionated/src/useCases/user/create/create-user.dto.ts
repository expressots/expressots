interface ICreateUserDTO {
    name: string;
    email: string;
}

interface ICreateUserResponseDTO {
    id: string;
    name: string;
    email: string;
    status: string;
}

export { ICreateUserDTO, ICreateUserResponseDTO };
