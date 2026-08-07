import { Container } from "@expressots/core/di";
import {
  CloudflareBindingNotFoundError,
  type CloudflareServices,
  cloudflareBindings,
  createCloudflareServices,
} from "./cloudflare-bindings";

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
  send(value: unknown): Promise<void>;
  sendBatch(values: Array<unknown>): Promise<void>;
}

interface AmbiguousBinding extends FakeKv, FakeQueue {}

interface TestEnv {
  SETTINGS: FakeKv;
  DB: FakeD1;
  FILES: FakeR2;
  JOBS: FakeQueue;
  AMBIGUOUS: AmbiguousBinding;
  TEXT: string;
}

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;

const typedBindings = cloudflareBindings<TestEnv>();
const Settings = typedBindings.kv("SETTINGS");
const Database = typedBindings.d1("DB");
const Files = typedBindings.r2("FILES");
const Jobs = typedBindings.queue("JOBS");

function inferSettings(services: CloudflareServices) {
  return services.get(Settings);
}

type SettingsType = Assert<Equal<ReturnType<typeof inferSettings>, FakeKv>>;
void (null as unknown as SettingsType);
void Database;
void Files;
void Jobs;

// @ts-expect-error D1 is not a KV namespace
typedBindings.kv("DB");
// @ts-expect-error plain values are not bindings
typedBindings.queue("TEXT");
// @ts-expect-error values matching multiple kinds are ambiguous
typedBindings.kv("AMBIGUOUS");

describe("cloudflareBindings", () => {
  const kv: FakeKv = {
    getWithMetadata: async () => ({ value: "dark" }),
  };

  it("does not create a container before the first resolution", () => {
    let containersCreated = 0;
    const services = createCloudflareServices({ SETTINGS: kv }, () => {
      containersCreated += 1;
      return new Container();
    });

    expect(containersCreated).toBe(0);
    expect(services.get(Settings)).toBe(kv);
    expect(services.get(Settings)).toBe(kv);
    expect(containersCreated).toBe(1);
  });

  it("creates frozen tokens with fresh service identifiers", () => {
    const anotherSettings = typedBindings.kv("SETTINGS");

    expect(Object.isFrozen(Settings)).toBe(true);
    expect(anotherSettings).not.toBe(Settings);
    expect(anotherSettings.serviceIdentifier).not.toBe(Settings.serviceIdentifier);
  });

  it("throws a named error for a missing binding", () => {
    let containersCreated = 0;
    const services = createCloudflareServices({}, () => {
      containersCreated += 1;
      return new Container();
    });

    try {
      services.get(Settings);
      throw new Error("Expected the missing binding to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(CloudflareBindingNotFoundError);
      expect(error).toMatchObject({
        code: "EXPRESSOTS_CLOUDFLARE_BINDING_NOT_FOUND",
        message: expect.stringContaining("SETTINGS"),
      });
    }
    expect(containersCreated).toBe(0);
  });
});
