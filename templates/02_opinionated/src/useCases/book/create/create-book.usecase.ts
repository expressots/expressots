import { AppError, Report, StatusCode } from "@expressots/core";
import { provide } from "inversify-binding-decorators";
import { ICreateBookDTO, ICreateBookResponseDTO } from "./create-book.dto";
import { Book } from "../../../entities/book.entity";

@provide(CreateBookUseCase)
class CreateBookUseCase {
  execute(data: ICreateBookDTO): ICreateBookResponseDTO {
    try {
      const book = new Book(data.id, data.title, data.author);

      if (!book) {
        Report.Error(
          new AppError(
            StatusCode.BadRequest,
            "Book already exists",
            "create-book-usecase",
          ),
        );
      }

      const response: ICreateBookResponseDTO = {
        id: book.id,
        title: book.title,
        author: book.author,
        status: "Book created successfully",
      };

      return response;
    } catch (error: any) {
      throw error;
    }
  }
}

export { CreateBookUseCase };
