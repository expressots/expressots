import { Principal } from "@expressots/core";

export interface UserDetails {
    id: string;
    email: string;
    roles: Array<string>;
    permissions: Array<string>;
}

export class AppPrincipal implements Principal<UserDetails> {
    constructor(public details: UserDetails) {}

    async isAuthenticated(): Promise<boolean> {
        return Boolean(this.details?.id);
    }

    async isInRole(role: string): Promise<boolean> {
        return this.details.roles.includes(role);
    }

    async isResourceOwner(resourceId: unknown): Promise<boolean> {
        return resourceId === this.details.id;
    }
}
