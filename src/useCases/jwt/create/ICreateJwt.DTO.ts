interface ICreateJwtDTO {
    email: string;
    password: string;
}

interface ICreateJwtReturn {
    token: string;
}

export { ICreateJwtDTO, ICreateJwtReturn };