export interface IBaseRepository<T> {
    create(item: T): T | null;
    update(item: T): T | null;
    delete(id: string): boolean;
    find(id: string): T | null;
    findAll(): T[];
}
