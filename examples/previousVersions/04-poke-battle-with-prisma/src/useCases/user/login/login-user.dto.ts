interface ILoginUserDTO {
  email: string;
  password: string;
}

interface ILoginUserResponseDTO {
  name: string;
  email: string;
  token: string;
  status: string;
}

export { ILoginUserDTO, ILoginUserResponseDTO };
