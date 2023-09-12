class UserFindRequestDTO {
    email: string;
}

class UserFindResponseDTO {
    id: string;
    name: string;
    email: string;
    message: string;
}

export { UserFindRequestDTO, UserFindResponseDTO };
