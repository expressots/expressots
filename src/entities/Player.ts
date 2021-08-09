
import { provide } from 'inversify-binding-decorators';
import { v4 as uuidv4 } from 'uuid';

@provide(Player)
export class Player {
    public readonly id!: string;
    public name!: string;
    public email!: string;
    public faction!: string;
    
    constructor(props: Omit<Player, 'id'>, id?: string){
        Object.assign(this, props);
    
        if (!id) {
            this.id = uuidv4();
        }
    
    }
}