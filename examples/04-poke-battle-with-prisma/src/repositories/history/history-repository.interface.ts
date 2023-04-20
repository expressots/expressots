import { IHistoryDTO } from "./history.dto";

interface IHistoryRepository {
  findAll(id: string): Promise<IHistoryDTO[]>;
  create(user: IHistoryDTO): Promise<IHistoryDTO>;
}

export { IHistoryRepository };
