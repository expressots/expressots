export class UserUpdateRequestDTO {
    name?: string;
    email: string;
}

export class UserUpdateResponseDTO {
    id: string;
    name: string;
    email: string;
    message: string;
}
