interface IBaseRepository<T> {
    create(item: T): T | null;
    update(item: T): T | null;
    delete(id: number | string): Promise<boolean>;
    find(id: number): Promise<T | null>;
    findAll(): Promise<T[]>;
}

export { IBaseRepository };
