export interface ICreateUserDTO {
    name: string;
    email: string;
    password: string;
}

export interface ICreateUserReturn {
    id: string,
    email: string,
    status: string
}