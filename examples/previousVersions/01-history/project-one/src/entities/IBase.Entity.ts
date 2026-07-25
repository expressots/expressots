interface IBaseEntity {
    // Unique id for the created entity
    readonly id: string;
    // The date timestamp when the entity was created
    readonly createdAt: Date;
    // The date timestamp when the entity was updated
    readonly updatedAt: Date;
}

export { IBaseEntity };