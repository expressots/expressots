import { CreateModule } from "@expressots/core";
import { CreateBookController } from "./create/create-book.controller";

const BookModule = CreateModule([CreateBookController]);

export { BookModule };
