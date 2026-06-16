interface IUpdateUserRequestDTO {
    id: string;
    name?: string;
    email?: string;
    password?: string;
}

interface IUpdateUserResponseDTO {
    id: string;
    name: string;
    email: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export { IUpdateUserRequestDTO, IUpdateUserResponseDTO };