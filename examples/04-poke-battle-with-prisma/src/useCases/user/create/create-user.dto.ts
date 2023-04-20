interface ICreateUserDTO {
  name: string;
  email: string;
  password: string;
}

interface ICreateUserResponseDTO {
  name: string;
  email: string;
  token: string;
  status: string;
}

export { ICreateUserDTO, ICreateUserResponseDTO };
