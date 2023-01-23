import { IBaseEntity } from "@entities/IBase.Entity";
import { provide } from "inversify-binding-decorators";
import { IBaseRepository } from "./IBase.Repository";
import { Document, Model, PopulateOptions } from "mongoose";
import { FilterQuery } from "mongoose";

@provide(BaseRepository)
class BaseRepository<T extends IBaseEntity, U extends Document> implements IBaseRepository<T, U> {

    protected model: Model<T>;

    async Create(item: U, refEntities: (Document | Document[])[] = [],
        embeddedRelations: string[] = [],
        refBack: boolean = false): Promise<U | null> {

        const parentRecord = await item.save();

        if (refEntities.length) {
            for (const entity of refEntities) {

                if ("collection" in entity) {
                    const referenceField: string = entity.collection.collectionName.slice(0, -1);

                    if (refBack) {
                        const referenceBackfield: string = parentRecord.collection.collectionName.slice(0, -1);

                        entity[referenceBackfield] = parentRecord.id;
                    }

                    const entityRecord = await entity.save();

                    if (parentRecord[referenceField] instanceof Array) {
                        if (!parentRecord[referenceField].includes(entityRecord.id)) {
                            parentRecord[referenceField].push(entityRecord.id);
                        }
                    } else {
                        parentRecord[referenceField] = entityRecord.id;
                    }
                } else {
                    const referenceField: string = entity[0].collection.collectionName.slice(0, -1);

                    if (parentRecord[referenceField]) {
                        parentRecord[referenceField] = [];

                        for (const reference of entity) {
                            if (refBack) {
                                const referenceBackfield: string = parentRecord.collection.collectionName.slice(0, -1);

                                entity[referenceBackfield] = parentRecord.id;
                            }

                            const referenceRecord: Document = await reference.save();

                            if (!parentRecord[referenceField].includes(referenceRecord.id)) {
                                parentRecord[referenceField].push(referenceRecord.id);
                            }
                        }
                    }
                }
            }

            await parentRecord.save();
        }

        if (embeddedRelations.length) {
            embeddedRelations = embeddedRelations.filter((relation) => {
                return relation in parentRecord;
            });

            await parentRecord.populate(embeddedRelations);
        }

        return Promise.resolve(parentRecord);
    }

    Update(item: U, refEntities: (Document<any, any, any> | Document<any, any, any>[])[], embeddedRelations: string[], refBack: boolean): Promise<U | null> {
        throw new Error("Method not implemented.");
    }

    async Delete(id: string): Promise<U | null> {
        try {
            const res = await this.model.deleteOne({ _id: id });
            return Promise.resolve(res as unknown as U);
        } catch {
            return Promise.reject(null);
        }
    }

    DeleteReferences(parent: U, referenceField: string, ids: string[]): Promise<U | null> {
        throw new Error("Method not implemented.");
    }

    async FindOne(query: FilterQuery<T>, embeddedRelations: string[] | PopulateOptions | PopulateOptions[] = []): Promise<U | null> {
        try {
            const user = await this.model
                .findOne(query)
                .populate(embeddedRelations)
                .then((userDocument) => {
                    return userDocument as U;
                });
            return Promise.resolve(user);
        } catch {
            return Promise.reject(null);
        }
    }

    async FindById(id: string, embeddedRelations: string[] | PopulateOptions | PopulateOptions[] = []): Promise<U | null> {
        try {
            console.log(id);
            const res = await this.model
                .findById(id)
                .populate(embeddedRelations)
                .then((userDocument) => {
                    return userDocument as U;
                });
            return Promise.resolve(res);

        } catch {
            return Promise.reject(null);
        }
    }

    FindAll(query: FilterQuery<T>, embeddedRelations: string[]): Promise<T[]> {
        throw new Error("Method not implemented.");
    }






}

export { BaseRepository };