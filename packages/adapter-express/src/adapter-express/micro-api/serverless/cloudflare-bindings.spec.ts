import {
  CloudflareBindingNotFoundError,
  type CloudflareBindingToken,
  cloudflareBindings,
  createCloudflareServices,
} from "./cloudflare-bindings";

// Minimal structural stand-ins for Cloudflare's runtime interfaces. Only the
// methods that identify each kind are declared, on purpose: the kind check
// must work from those alone.
interface FakeKv {
  getWithMetadata(key: string): Promise<{ value: string | null }>;
}
interface FakeD1 {
  prepare(query: string): object;
  batch(statements: Array<object>): Promise<Array<object>>;
  exec(query: string): Promise<object>;
}
interface FakeR2 {
  head(key: string): Promise<object | null>;
  createMultipartUpload(key: string): Promise<object>;
}
interface FakeQueue {
  send(message: unknown): Promise<void>;
  sendBatch(messages: Array<unknown>): Promise<void>;
}
interface LooksLikeKvAndQueue extends FakeKv, FakeQueue {}

interface TestEnv {
  SETTINGS: FakeKv;
  DB: FakeD1;
  FILES: FakeR2;
  JOBS: FakeQueue;
  AMBIGUOUS: LooksLikeKvAndQueue;
  API_URL: string;
  OPTIONAL_KV?: FakeKv;
}

const bindings = cloudflareBindings<TestEnv>();
const Settings = bindings.kv("SETTINGS");
const Database = bindings.d1("DB");
const Files = bindings.r2("FILES");
const Jobs = bindings.queue("JOBS");
const OptionalKv = bindings.kv("OPTIONAL_KV");

// ---------------------------------------------------------------------------
// Compile-time contract. ts-jest reports type errors, so an unused
// expect-error directive fails the suite: each one below is a real assertion.
// ---------------------------------------------------------------------------

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;
type ValueOfToken<T> = T extends CloudflareBindingToken<infer V> ? V : never;

type ExactValue = Assert<Equal<ValueOfToken<typeof Settings>, FakeKv>>;
type OptionalValue = Assert<Equal<ValueOfToken<typeof OptionalKv>, FakeKv | undefined>>;
type ResolvedValue = Assert<
  Equal<
    ReturnType<typeof createCloudflareServices>["get"] extends <T>(
      t: CloudflareBindingToken<T>,
    ) => T
      ? true
      : false,
    true
  >
>;
void (null as unknown as [ExactValue, OptionalValue, ResolvedValue]);

// @ts-expect-error a D1 database is not a KV namespace
bindings.kv("DB");
// @ts-expect-error a plain string var is not a binding of any kind
bindings.queue("API_URL");
// @ts-expect-error a value matching two kinds is ambiguous and matches neither
bindings.kv("AMBIGUOUS");
// @ts-expect-error unknown names are rejected when Env is explicit
bindings.r2("NOPE");

// Without an explicit Env the names fall back to string, for apps whose
// bindings are configured dynamically.
const untyped = cloudflareBindings();
void untyped.kv("ANY_NAME_GOES");

describe("cloudflareBindings tokens", () => {
  it("memoizes frozen tokens by kind and name", () => {
    expect(Object.isFrozen(Settings)).toBe(true);
    expect(cloudflareBindings<TestEnv>().kv("SETTINGS")).toBe(Settings);
    expect(cloudflareBindings().kv("SETTINGS")).toBe(Settings);
    expect(cloudflareBindings().queue("SETTINGS")).not.toBe(Settings);
    expect(Settings).toMatchObject({ kind: "kv", name: "SETTINGS" });
    expect(Jobs).toMatchObject({ kind: "queue", name: "JOBS" });
  });

  it("rejects empty binding names at creation", () => {
    expect(() => cloudflareBindings().kv("")).toThrow(TypeError);
    expect(() => cloudflareBindings().d1(undefined as unknown as string)).toThrow(TypeError);
  });
});

describe("createCloudflareServices", () => {
  const kv: FakeKv = { getWithMetadata: async () => ({ value: "dark" }) };
  const d1: FakeD1 = { prepare: () => ({}), batch: async () => [], exec: async () => ({}) };
  const r2: FakeR2 = { head: async () => null, createMultipartUpload: async () => ({}) };
  const queue: FakeQueue = { send: async () => undefined, sendBatch: async () => undefined };

  it("resolves each token to the value under its name in env", () => {
    const services = createCloudflareServices({ SETTINGS: kv, DB: d1, FILES: r2, JOBS: queue });

    expect(services.get(Settings)).toBe(kv);
    expect(services.get(Database)).toBe(d1);
    expect(services.get(Files)).toBe(r2);
    expect(services.get(Jobs)).toBe(queue);
    expect(services.has(Settings)).toBe(true);
    expect(services.has(OptionalKv)).toBe(false);
  });

  it("does not cache values: each call reads the env it was created with", () => {
    const first = createCloudflareServices({ SETTINGS: kv });
    const other: FakeKv = { getWithMetadata: async () => ({ value: "light" }) };
    const second = createCloudflareServices({ SETTINGS: other });

    expect(first.get(Settings)).toBe(kv);
    expect(second.get(Settings)).toBe(other);
    expect(first.get(Settings)).toBe(kv);
  });

  it("throws a named, coded error for a binding missing from env", () => {
    const services = createCloudflareServices({});

    expect(() => services.get(Settings)).toThrow(CloudflareBindingNotFoundError);
    expect(() => services.get(Settings)).toThrow(
      expect.objectContaining({
        name: "CloudflareBindingNotFoundError",
        code: "EXPRESSOTS_CLOUDFLARE_BINDING_NOT_FOUND",
        bindingName: "SETTINGS",
        bindingKind: "kv",
        message: expect.stringContaining('kv binding "SETTINGS"'),
      }),
    );
  });

  it("treats an explicitly undefined binding as missing", () => {
    const services = createCloudflareServices({ SETTINGS: undefined });

    expect(services.has(Settings)).toBe(false);
    expect(() => services.get(Settings)).toThrow(CloudflareBindingNotFoundError);
  });

  it.each(["toString", "constructor", "hasOwnProperty", "__proto__"])(
    "never resolves the inherited %s property as a binding",
    (name) => {
      const services = createCloudflareServices({});
      const token = cloudflareBindings().kv(name);

      expect(services.has(token)).toBe(false);
      expect(() => services.get(token)).toThrow(CloudflareBindingNotFoundError);
    },
  );

  it("rejects anything that is not a binding token", () => {
    const services = createCloudflareServices({ SETTINGS: kv });
    const notTokens: Array<unknown> = [
      "SETTINGS",
      { kind: "kv", name: "SETTINGS" },
      { ...Settings },
      null,
      undefined,
    ];

    for (const candidate of notTokens) {
      expect(() => services.get(candidate as CloudflareBindingToken<unknown>)).toThrow(TypeError);
    }
  });
});
