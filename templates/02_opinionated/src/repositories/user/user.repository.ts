import { provide } from "inversify-binding-decorators";
import { User } from "@entities/user.entity";
import { BaseRepository } from "@repositories/base-repository";

@provide(UserRepository)
class UserRepository extends BaseRepository<User> {
  constructor() {
    super();
  }
}

export { UserRepository };
