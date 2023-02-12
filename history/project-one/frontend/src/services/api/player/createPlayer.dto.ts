import * as yup from "yup";

export interface ICreatePlayerDTO {
  name: string;
  email: string;
  faction: string;
}

export const createPlayerSchema: yup.SchemaOf<ICreatePlayerDTO> = yup.object({
  name: yup.string().required("Name is required"),
  email: yup
    .string()
    .required("Please type your email")
    .email("Please type a valid email"),
  faction: yup.string().required("Please type your faction"),
});
