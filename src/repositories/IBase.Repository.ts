import { IBaseEntity } from "@entities/IBase.Entity";
import { Document, FilterQuery, PopulateOptions } from "mongoose";

interface IBaseRepository<T extends IBaseEntity, U extends Document> {
    Create(item: U,
        refEntities: (Document | Document[])[],
        embeddedRelations: string[],
        refBack: boolean,
    ): Promise<U | null>;

    Update(item: U,
        refEntities: (Document | Document[])[],
        embeddedRelations: string[],
        refBack: boolean,
    ): Promise<U | null>;

    Delete(id: string): Promise<U | null>;

    DeleteReferences(parent: U, referenceField: string, ids: string[]): Promise<U | null>;

    FindOne(query: FilterQuery<T>, embeddedRelations: string[] | PopulateOptions | PopulateOptions[]): Promise<U | null>;

    FindById(id: string, embeddedRelations: string[] | PopulateOptions | PopulateOptions[]): Promise<U | null>;

    FindAll(query: FilterQuery<T>, embeddedRelations: string[] | PopulateOptions | PopulateOptions[]): Promise<U[]>;
}

export { IBaseRepository };