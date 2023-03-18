import { User } from "@entities/user.entity";
import { BaseRepository } from "@repositories/base-repository";
import { provideSingleton } from "helpers/provide-singleton";

@provideSingleton(UserRepository)
class UserRepository extends BaseRepository<User> {
  constructor() {
    super();
  }
}

export { UserRepository };
