import { provideSingleton } from "@expressots/core";
import { IEntity } from "@entities/base.entity";

@provideSingleton(InMemoryDB)
class InMemoryDB {
    private readonly USERDB: IEntity[] = [];

    public getUserDB(): IEntity[] {
        return this.USERDB;
    }
}

export { InMemoryDB };
