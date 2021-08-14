
import { provide } from 'inversify-binding-decorators';
import { v4 as uuidv4 } from 'uuid';

@provide(Player)
export class Player {
    public readonly id!: string;
    public name!: string;
    public email!: string;
    public faction!: string;
    
    constructor(name: string, email: string, faction: string) {
        this.id = uuidv4();
        this.name = name;
        this.email = email;
        this.faction = faction;
    }
}