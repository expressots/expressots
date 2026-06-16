import { IBootstrap, IShutdown, provideSingleton } from "@expressots/core";
import { PrismaClient } from "@prisma/client";

@provideSingleton(PrismaProvider)
export class PrismaProvider extends PrismaClient implements IBootstrap, IShutdown {
    bootstrap() {
        return this.$connect();
    }

    shutdown() {
        return this.$disconnect();
    }
}
