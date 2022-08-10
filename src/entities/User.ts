
import { provide } from 'inversify-binding-decorators';
import { HashPassword } from '@providers/crypto-password-hash-gen/CryptoHashPassword.Provider';
import { v4 as uuidv4 } from 'uuid';

@provide(User)
class User {
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
}

export { User };