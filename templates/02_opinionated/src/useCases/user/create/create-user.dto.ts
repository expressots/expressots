interface ICreateUserDTO {
  name: string;
  email: string;
}

interface ICreateUserResponseDTO {
  name: string;
  email: string;
  status: string;
}

export { ICreateUserDTO, ICreateUserResponseDTO };
