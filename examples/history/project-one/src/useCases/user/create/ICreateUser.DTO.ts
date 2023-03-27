export interface ICreateUserDTO {
    name: string;
    email: string;
    password: string;
}

export interface ICreateUserReturnDTO {
    id: string,
    email: string,
    status: string
}