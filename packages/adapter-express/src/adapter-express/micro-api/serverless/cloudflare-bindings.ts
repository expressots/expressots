import { Container } from "@expressots/core/di";
import {
  CLOUDFLARE_BINDING_TOKEN_BRAND,
  CLOUDFLARE_SERVICES_FACTORY,
  type CloudflareServicesFactory,
} from "./cloudflare-bindings.contract.js";

export type CloudflareBindingKind = "kv" | "d1" | "r2" | "queue";

type IsMethod<T> = T extends (...args: infer Args) => unknown
  ? Args extends Array<unknown>
    ? true
    : false
  : false;
type AllMethods<T, Keys extends PropertyKey> = false extends {
  [K in Keys]: K extends keyof T ? IsMethod<T[K]> : false;
}[Keys]
  ? false
  : true;

type MatchesKind<T, Kind extends CloudflareBindingKind> = Kind extends "kv"
  ? AllMethods<T, "getWithMetadata">
  : Kind extends "d1"
    ? AllMethods<T, "prepare" | "batch" | "exec">
    : Kind extends "r2"
      ? AllMethods<T, "head" | "createMultipartUpload">
      : AllMethods<T, "send" | "sendBatch">;

type MatchingKinds<T> = {
  [Kind in CloudflareBindingKind]: MatchesKind<T, Kind> extends true ? Kind : never;
}[CloudflareBindingKind];

type ExactBindingKey<TEnv, Kind extends CloudflareBindingKind> = Extract<
  {
    [Key in keyof TEnv]-?: [MatchingKinds<TEnv[Key]>] extends [Kind]
      ? [Kind] extends [MatchingKinds<TEnv[Key]>]
        ? Key
        : never
      : never;
  }[keyof TEnv],
  string
>;

export interface CloudflareBindingToken<T> {
  readonly [CLOUDFLARE_BINDING_TOKEN_BRAND]: true;
  readonly serviceIdentifier: symbol;
  readonly bindingName: string;
  readonly kind: CloudflareBindingKind;
  readonly __valueType?: T;
}

export interface CloudflareServices {
  get<T>(token: CloudflareBindingToken<T>): T;
}

export interface CloudflareBindings<TEnv extends object> {
  kv<Key extends ExactBindingKey<TEnv, "kv">>(bindingName: Key): CloudflareBindingToken<TEnv[Key]>;
  d1<Key extends ExactBindingKey<TEnv, "d1">>(bindingName: Key): CloudflareBindingToken<TEnv[Key]>;
  r2<Key extends ExactBindingKey<TEnv, "r2">>(bindingName: Key): CloudflareBindingToken<TEnv[Key]>;
  queue<Key extends ExactBindingKey<TEnv, "queue">>(
    bindingName: Key,
  ): CloudflareBindingToken<TEnv[Key]>;
  readonly [CLOUDFLARE_SERVICES_FACTORY]: CloudflareServicesFactory<TEnv>;
}

type BindingContainer = Pick<Container, "bind" | "get" | "isBound">;
type ContainerFactory = () => BindingContainer;

export class CloudflareBindingNotFoundError extends Error {
  public readonly code = "EXPRESSOTS_CLOUDFLARE_BINDING_NOT_FOUND";

  public constructor(bindingName: string) {
    super(`Cloudflare binding "${bindingName}" is not available in this request`);
    this.name = "CloudflareBindingNotFoundError";
  }
}

function createBindingToken<T>(
  bindingName: string,
  kind: CloudflareBindingKind,
): CloudflareBindingToken<T> {
  return Object.freeze({
    [CLOUDFLARE_BINDING_TOKEN_BRAND]: true as const,
    serviceIdentifier: Symbol(bindingName),
    bindingName,
    kind,
  });
}

export function createCloudflareServices<TEnv extends object>(
  env: TEnv,
  createContainer: ContainerFactory = () => new Container(),
): CloudflareServices {
  let container: BindingContainer | undefined;
  const runtimeEnv = env as Record<string, unknown>;

  return {
    get<T>(token: CloudflareBindingToken<T>): T {
      if (
        token === null ||
        typeof token !== "object" ||
        token[CLOUDFLARE_BINDING_TOKEN_BRAND] !== true ||
        typeof token.serviceIdentifier !== "symbol" ||
        typeof token.bindingName !== "string"
      ) {
        throw new TypeError("Cloudflare services require a Cloudflare binding token");
      }

      const value = runtimeEnv[token.bindingName];
      if (value === undefined) {
        throw new CloudflareBindingNotFoundError(token.bindingName);
      }

      container ??= createContainer();
      if (!container.isBound(token.serviceIdentifier)) {
        container.bind<T>(token.serviceIdentifier).toConstantValue(value as T);
      }
      return container.get<T>(token.serviceIdentifier);
    },
  };
}

export function cloudflareBindings<TEnv extends object>(): CloudflareBindings<TEnv> {
  return {
    kv: (bindingName) => createBindingToken(bindingName, "kv"),
    d1: (bindingName) => createBindingToken(bindingName, "d1"),
    r2: (bindingName) => createBindingToken(bindingName, "r2"),
    queue: (bindingName) => createBindingToken(bindingName, "queue"),
    [CLOUDFLARE_SERVICES_FACTORY]: (env) => createCloudflareServices(env),
  } as CloudflareBindings<TEnv>;
}
