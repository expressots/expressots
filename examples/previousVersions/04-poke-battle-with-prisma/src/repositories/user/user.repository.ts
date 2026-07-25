import { User } from "@entities/user.entity";
import {
  PrismaClientProvider,
  prismaClient,
} from "@providers/database/orm/prisma/prisma-client.provider";
import bcrypt from "bcrypt";
import { provide } from "inversify-binding-decorators";
import { IUserRepository } from "./user-repository.interface";
import { IUserDTO } from "./user.dto";

@provide(UserRepository)
class UserRepository implements IUserRepository {
  constructor(private prismaProvider: PrismaClientProvider) {}

  async find(id: string): Promise<{ name: string; email: string } | null> {
    const user = await prismaClient.user.findUnique({
      where: { id },
    });

    return user ? this.mapToDTOWithoutPassword(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await prismaClient.user.findUnique({
      where: { email },
    });
    return user ? this.mapToDTO(user) : null;
  }

  async findAll(): Promise<{ name: string; email: string }[]> {
    const users = await prismaClient.user.findMany();

    return users.map((user) => this.mapToFindAllDTO(user));
  }

  async create(user: IUserDTO): Promise<User> {
    const password = await bcrypt.hash(user.password, 10);

    const createdUser = await prismaClient.user.create({
      data: this.prismaProvider.mapToPrisma<IUserDTO, User>({
        ...user,
        password,
      }),
    });
    return this.mapToDTO(createdUser);
  }

  async update(id: string, user: IUserDTO): Promise<User | null> {
    const updatedUser = await prismaClient.user.update({
      where: { id },
      data: user,
    });

    return this.mapToDTO(updatedUser);
  }

  async delete(id: string): Promise<boolean> {
    await prismaClient.user.delete({ where: { id } });
    return true;
  }

  private mapToDTO(user: IUserDTO): User {
    const newUser = new User(user.name, user.email, user.password, user.id);
    return newUser;
  }

  private mapToDTOWithoutPassword(user: IUserDTO): {
    name: string;
    email: string;
    id: string;
  } {
    const newUser = new User(user.name, user.email, user.password, user.id);
    return {
      name: newUser.name,
      email: newUser.email,
      id: newUser.id,
    };
  }

  private mapToFindAllDTO(user: IUserDTO): { name: string; email: string } {
    const newUser = new User(user.name, user.email, user.password, user.id);
    return {
      name: newUser.name,
      email: newUser.email,
    };
  }
}

export { UserRepository };
