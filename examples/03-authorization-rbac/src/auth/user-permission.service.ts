import { inject, provide, type IPermissionService } from "@expressots/core";
import { UserRepository } from "../users/user.repository";

@provide(UserPermissionService)
export class UserPermissionService implements IPermissionService {
    constructor(@inject(UserRepository) private readonly users: UserRepository) {}

    async getPermissions(userId: string): Promise<Array<string>> {
        const user = this.users.findById(userId);
        return user?.permissions ?? [];
    }

    async hasPermission(userId: string, permission: string): Promise<boolean> {
        const permissions = await this.getPermissions(userId);
        return permissions.includes(permission);
    }
}
