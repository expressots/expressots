class CreateUserRequestDTO {
    name: string;
    email: string;
}

class CreateUserResponseDTO {
    id: string;
    name: string;
    email: string;
    message: string;
}

export { CreateUserRequestDTO, CreateUserResponseDTO };
