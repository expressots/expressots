import { provide } from "@expressots/core";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

export interface StoredUser {
    id: string;
    email: string;
    passwordHash: string;
    roles: Array<string>;
    permissions: Array<string>;
}

@provide(UserRepository)
export class UserRepository {
    private readonly users = new Map<string, StoredUser>();

    constructor() {
        const seed: StoredUser = {
            id: "u1",
            email: "demo@expressots.dev",
            passwordHash: bcrypt.hashSync("password123", 10),
            roles: ["user"],
            permissions: ["profile:read"],
        };
        this.users.set(seed.email, seed);
    }

    findByEmail(email: string): StoredUser | undefined {
        return this.users.get(email);
    }

    findById(id: string): StoredUser | undefined {
        return [...this.users.values()].find((user) => user.id === id);
    }

    async create(input: {
        email: string;
        password: string;
        roles?: Array<string>;
        permissions?: Array<string>;
    }): Promise<StoredUser> {
        if (this.users.has(input.email)) {
            throw new Error("Email already registered");
        }

        const user: StoredUser = {
            id: randomUUID(),
            email: input.email,
            passwordHash: await bcrypt.hash(input.password, 10),
            roles: input.roles ?? ["user"],
            permissions: input.permissions ?? ["profile:read"],
        };

        this.users.set(user.email, user);
        return user;
    }
}
