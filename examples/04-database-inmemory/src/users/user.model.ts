import type { ITimestampedEntity } from "@expressots/core";

export interface UserModel extends ITimestampedEntity {
    email: string;
    name: string;
}
