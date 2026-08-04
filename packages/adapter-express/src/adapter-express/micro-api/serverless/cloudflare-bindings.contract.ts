export const CLOUDFLARE_BINDING_TOKEN_BRAND = Symbol.for(
  "@expressots/adapter-express/cloudflare-binding-token",
);

export const CLOUDFLARE_SERVICES_FACTORY = Symbol.for(
  "@expressots/adapter-express/cloudflare-services-factory",
);

export interface CloudflareServicesFactory<TEnv extends object> {
  (env: TEnv): import("./cloudflare-bindings.js").CloudflareServices;
}
