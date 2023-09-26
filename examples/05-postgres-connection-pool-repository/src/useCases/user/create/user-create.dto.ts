export class CreateUserRequestDTO {
    name: string;
    email: string;
}

export class CreateUserResponseDTO {
    id: string;
    name: string;
    email: string;
    message: string;
}
