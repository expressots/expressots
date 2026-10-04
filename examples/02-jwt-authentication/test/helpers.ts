import { JwtProvider } from "@expressots/jwt";
export async function signTestToken(details: {
    id: string;
    roles?: Array<string>;
    permissions?: Array<string>;
}): Promise<string> {
    const jwt = new JwtProvider();
    const result = jwt.configure({});
    if (!result.valid) throw new Error(result.errors?.join("; "));
    await jwt.bootstrap();
    try {
        return await jwt.signAccessToken(details.id, {
            email: "test@expressots.dev",
            roles: details.roles ?? ["user"],
            permissions: details.permissions ?? ["profile:read"],
        });
    } finally {
        await jwt.shutdown();
    }
}
