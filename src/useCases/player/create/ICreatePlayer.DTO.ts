export interface ICreatePlayerDTO {
    name: string;
    email: string;
    faction: string;
}

export interface ICreatePlayerReturn {
    id: string,
    email: string,
    status: string
}