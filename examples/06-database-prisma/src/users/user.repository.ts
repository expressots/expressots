import { inject, provide } from "@expressots/core";
import { PrismaProvider } from "../providers/prisma.provider";

@provide(UserRepository)
export class UserRepository {
    constructor(@inject(PrismaProvider) private readonly prisma: PrismaProvider) {}

    list() {
        return this.prisma.user.findMany({ orderBy: { createdAt: "desc" } });
    }

    findById(id: string) {
        return this.prisma.user.findUnique({ where: { id } });
    }

    create(input: { email: string; name: string }) {
        return this.prisma.user.create({ data: input });
    }
}
