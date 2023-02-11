interface ICreateBookDTO {
    id: number;
    title: string;
    author: string;
}

interface ICreateBookResponseDTO {
    id: number;
    title: string;
    auhtor: string;
    status: string;
}

export { ICreateBookDTO, ICreateBookResponseDTO };
