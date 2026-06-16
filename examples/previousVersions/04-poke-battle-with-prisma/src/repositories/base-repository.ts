import { provide } from "inversify-binding-decorators";
import { IBaseRepository } from "./base-repository.interface";
import { IEntity } from "@entities/base.entity";

@provide(BaseRepository)
class BaseRepository<T extends IEntity> implements IBaseRepository<T> {
  private readonly DB: T[] = [];

  create(item: T): T | null {
    this.DB.push(item);
    return item;
  }

  update(item: T) {
    this.DB.push(item);
    return item;
  }

  delete(id: string): boolean {
    const index: number = this.DB.findIndex((item) => item.Id === id);

    if (index != -1) {
      this.DB.splice(index, 1);
      return true;
    }
    return false;
  }

  find(id: string): T | null {
    const user = this.DB.find((item) => item.Id === id);
    return user || null;
  }

  findAll(): T[] {
    return this.DB;
  }
}

export { BaseRepository };
