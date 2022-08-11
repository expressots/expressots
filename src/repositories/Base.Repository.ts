import { IBaseEntity } from "@entities/IBase.Entity";
import { provide } from "inversify-binding-decorators";
import { IBaseRepository } from "./IBase.Repository";

@provide(BaseRepository)
class BaseRepository<T extends IBaseEntity> implements IBaseRepository<T> {

    public objects: T[] = [];

    Create(item: T): Promise<T> {
        this.objects.push(item);

        return Promise.resolve(item);
    }

    Update(item: T): Promise<T> {
        const userFoundIndex: number = this.objects.findIndex(u => u.Id === item.Id);
        if (userFoundIndex > -1) {
            this.objects[userFoundIndex] = item;
        }

        return Promise.resolve(item);
    }

    Delete(id: string): Promise<T> {
        const item = (this.objects.splice(this.objects.findIndex(u => u.Id === id), 1))[0];

        return Promise.resolve(item);
    }

    FindOne(id: string): Promise<T | undefined> {
        const userFound = this.objects.find(u => u.Id === id);

        return Promise.resolve(userFound);
    }

    FindAll(): Promise<T[]> {
        return Promise.resolve(this.objects);
    }
}

export { BaseRepository };