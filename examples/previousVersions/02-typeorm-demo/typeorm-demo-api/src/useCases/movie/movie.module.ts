import { ContainerModule } from "inversify";
import { CreateModule } from "@expressots/core";
import { CreateMovieController } from "./create/create-movie.controller";
import { FindAllMovieController } from "./findAll/findall-movie.controller";
import { FindOneMovieController } from "./findOne/findone-movie.controller";
import { DeleteMovieController } from "./delete/delete-movie.controller";

const MovieModule: ContainerModule = CreateModule([
    CreateMovieController,
    FindAllMovieController,
    FindOneMovieController,
    DeleteMovieController,
]);

export { MovieModule };
