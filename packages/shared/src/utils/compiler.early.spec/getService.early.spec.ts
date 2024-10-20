// Unit tests for: getService

import { Compiler } from "../compiler";

const mockRegister = jest.fn();
jest.mock("ts-node", () => ({
  __esModule: true,
  register: mockRegister,
}));

describe("Compiler.getService() getService method", () => {
  let compiler: Compiler;

  beforeEach(() => {
    compiler = Compiler.Instance;
  });

  it("should return a Service instance from ts-node", async () => {
    // Arrange
    const mockService = {}; // Mocked Service instance
    mockRegister.mockReturnValue(mockService);

    // Act
    const service = await compiler.getService();

    // Assert
    expect(mockRegister).toHaveBeenCalledWith({
      compilerOptions: {
        module: "commonjs",
      },
      moduleTypes: {
        "**": "cjs",
      },
    });
    expect(service).toBe(mockService);
  });

  it("should ensure the singleton pattern is maintained", async () => {
    // Arrange
    const anotherCompilerInstance = Compiler.Instance;

    // Act & Assert
    expect(compiler).toBe(anotherCompilerInstance);
  });
});

// End of unit tests for: getService
