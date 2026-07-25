// Unit tests for: getControllerMethodMetadata

import type { ControllerMethodMetadata } from "../interfaces";
import { getControllerMethodMetadata } from "../utils";

const mockGetOwnMetadata = jest.fn();
const mockGetMetadata = jest.fn();

Reflect.getOwnMetadata = mockGetOwnMetadata;
Reflect.getMetadata = mockGetMetadata;

interface MockNewableFunction {
  prototype: any;
}

describe("getControllerMethodMetadata() getControllerMethodMetadata method", () => {
  let mockConstructor: MockNewableFunction;

  beforeEach(() => {
    mockConstructor = {
      prototype: {},
    } as any;

    mockGetOwnMetadata.mockReset();
    mockGetMetadata.mockReset();
  });

  it("should return combined metadata when both methodMetadata and genericMetadata are defined", () => {
    const methodMetadata: Array<ControllerMethodMetadata> = [
      { key: "method1", method: "GET" } as any,
    ];
    const genericMetadata: Array<ControllerMethodMetadata> = [
      { key: "method2", method: "POST" } as any,
    ];

    mockGetOwnMetadata.mockReturnValue(methodMetadata as any);
    mockGetMetadata.mockReturnValue(genericMetadata as any);

    const result = getControllerMethodMetadata(mockConstructor as any);

    expect(result).toEqual([...methodMetadata, ...genericMetadata]);
  });

  it("should return methodMetadata when only methodMetadata is defined", () => {
    const methodMetadata: Array<ControllerMethodMetadata> = [
      { key: "method1", method: "GET" } as any,
    ];

    mockGetOwnMetadata.mockReturnValue(methodMetadata as any);
    mockGetMetadata.mockReturnValue(undefined);

    const result = getControllerMethodMetadata(mockConstructor as any);

    expect(result).toEqual(methodMetadata);
  });

  it("should return genericMetadata when only genericMetadata is defined", () => {
    const genericMetadata: Array<ControllerMethodMetadata> = [
      { key: "method2", method: "POST" } as any,
    ];

    mockGetOwnMetadata.mockReturnValue(undefined);
    mockGetMetadata.mockReturnValue(genericMetadata as any);

    const result = getControllerMethodMetadata(mockConstructor as any);

    expect(result).toEqual(genericMetadata);
  });

  it("should return undefined when both methodMetadata and genericMetadata are undefined", () => {
    mockGetOwnMetadata.mockReturnValue(undefined);
    mockGetMetadata.mockReturnValue(undefined);

    const result = getControllerMethodMetadata(mockConstructor as any);

    expect(result).toBeUndefined();
  });
});

// End of unit tests for: getControllerMethodMetadata
