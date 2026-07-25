import { IUserDTO } from "./user.dto";

interface IUserRepository {
  find(id: string): Promise<{ name: string; email: string } | null>;
  findByEmail(email: string): Promise<IUserDTO | null>;
  findAll(): Promise<{ name: string; email: string }[]>;
  create(user: IUserDTO): Promise<IUserDTO>;
  update(id: string, user: IUserDTO): Promise<IUserDTO | null>;
  delete(id: string): Promise<boolean>;
}

export { IUserRepository };
