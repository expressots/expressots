class UserUpdateRequestDTO {
    name?: string;
    email: string;
}

class UserUpdateResponseDTO {
    id: string;
    name: string;
    email: string;
    message: string;
}

export { UserUpdateRequestDTO, UserUpdateResponseDTO };
