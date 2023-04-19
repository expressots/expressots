import { IEntity } from "@entities/base.entity";
import { provideSingleton } from "@providers/bindingType/provide-singleton";

@provideSingleton(InMemoryDB)
class InMemoryDB {
    private readonly USERDB: IEntity[] = [];

    public getUserDB(): IEntity[] {
        return this.USERDB;
    }
}

export { InMemoryDB };
