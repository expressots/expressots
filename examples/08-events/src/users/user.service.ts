import { provide, inject, EventEmitter } from "@expressots/core";
import { randomUUID } from "node:crypto";
import { UserCreatedEvent } from "@events/user-created.event";

export interface UserRecord {
    id: string;
    email: string;
}

@provide(UserService)
export class UserService {
    private readonly users = new Map<string, UserRecord>();

    constructor(@inject(EventEmitter) private readonly eventEmitter: EventEmitter) {}

    async create(email: string): Promise<UserRecord> {
        const user: UserRecord = { id: randomUUID(), email };
        this.users.set(user.id, user);
        await this.eventEmitter.emit(new UserCreatedEvent(user.id, user.email));
        return user;
    }

    findById(id: string): UserRecord | undefined {
        return this.users.get(id);
    }
}
