
import { provide } from 'inversify-binding-decorators';
import { hashPassword } from 'utils/password/Password.Utils';
import { v4 as uuidv4 } from 'uuid';

@provide(User)
export class User {
    public readonly id!: string;
    public name: string;
    public email!: string;
    public password!: string;
    public hashedPassword!: string;

    constructor(name: string, email: string, password: string) {
        this.id = uuidv4();
        this.name = name;
        this.email = email;
        if(password){
            this.hashedPassword = hashPassword(password);
        }
    }
}