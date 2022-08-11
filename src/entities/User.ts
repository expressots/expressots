
import { provide } from "inversify-binding-decorators";
import { HashPassword } from "@providers/crypto-password-hash-gen/CryptoHashPassword.Provider";
import { v4 as uuidv4 } from "uuid";
import { IBaseEntity } from "./IBase.Entity";

@provide(User)
class User implements IBaseEntity {
    public readonly id!: string;
    public name: string;
    public email!: string;
    public password!: string;
    public hashedPassword!: string;

    constructor(name: string, email: string, password: string) {
        this.id = uuidv4();
        this.name = name;
        this.email = email;
        if (password) {
            this.hashedPassword = HashPassword(password);
        }
    }

    public get Id(): string {
        return this.id;
    }

    public get Name(): string {
        return this.name;
    }

    public set Name(name: string) {
        this.name = name;
    }

    public get Email(): string {
        return this.email;
    }

    public set Email(email: string) {
        this.email = email;
    }
}

export { User };