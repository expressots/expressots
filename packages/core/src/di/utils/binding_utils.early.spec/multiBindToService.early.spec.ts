// Unit tests for: multiBindToService

import { multiBindToService } from "../binding_utils";
import { interfaces } from "../../interfaces/interfaces";
import { Container } from "../../container/container";

describe("multiBindToService() multiBindToService function", () => {
  let container: Container;
  let mockBind: jest.Mock;

  beforeEach(() => {
    container = new Container();
    mockBind = jest.fn().mockReturnValue({
      toService: jest.fn(),
    });
    (container as any).bind = mockBind;
  });

  describe("Happy Path", () => {
    it("should bind multiple types to a service", () => {
      // Arrange
      const service = "IService";
      const type1 = "IType1";
      const type2 = "IType2";
      const multiBind = multiBindToService(container);

      // Act
      multiBind(service as any)(type1 as any, type2 as any);

      // Assert
      expect(mockBind).toHaveBeenCalledTimes(2);
      expect(mockBind).toHaveBeenCalledWith(type1);
      expect(mockBind).toHaveBeenCalledWith(type2);
    });

    it("should call toService for each binding", () => {
      // Arrange
      const service = "IService";
      const type1 = "IType1";
      const toServiceMock = jest.fn();
      mockBind.mockReturnValue({
        toService: toServiceMock,
      });
      const multiBind = multiBindToService(container);

      // Act
      multiBind(service as any)(type1 as any);

      // Assert
      expect(toServiceMock).toHaveBeenCalledWith(service);
    });
  });
});

// End of unit tests for: multiBindToService
