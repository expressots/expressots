import { provide } from "inversify-binding-decorators";
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { IEntity } from "./base.entity";

@provide(Movie)
@Entity()
class Movie implements IEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    title: string;

    @Column()
    year: number;

    @Column()
    genre: string;

    constructor(title: string, year: number, genre: string) {
        this.title = title;
        this.year = year;
        this.genre = genre;
    }
}

export { Movie };
