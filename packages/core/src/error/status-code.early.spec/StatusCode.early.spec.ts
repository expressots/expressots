// Unit tests for: StatusCode enum

import { StatusCode } from "../status-code";

describe("StatusCode StatusCode enum", () => {
  describe("Happy Path", () => {
    it("should export StatusCode with all HTTP status codes", () => {
      // Assert
      expect(StatusCode).toBeDefined();
      expect(typeof StatusCode).toBe("object");
    });

    it("should include InformationResponse codes", () => {
      // Assert
      expect(StatusCode.Continue).toBe(100);
      expect(StatusCode.SwitchingProtocols).toBe(101);
      expect(StatusCode.Processing).toBe(102);
      expect(StatusCode.eEarlyHints).toBe(103);
    });

    it("should include SuccessfulResponse codes", () => {
      // Assert
      expect(StatusCode.OK).toBe(200);
      expect(StatusCode.Created).toBe(201);
      expect(StatusCode.Accepted).toBe(202);
      expect(StatusCode.NoContent).toBe(204);
    });

    it("should include ClientErrorResponse codes", () => {
      // Assert
      expect(StatusCode.BadRequest).toBe(400);
      expect(StatusCode.Unauthorized).toBe(401);
      expect(StatusCode.Forbidden).toBe(403);
      expect(StatusCode.NotFound).toBe(404);
      expect(StatusCode.Conflict).toBe(409);
      expect(StatusCode.UnprocessableEntity).toBe(422);
    });

    it("should include ServerErrorResponse codes", () => {
      // Assert
      expect(StatusCode.InternalServerError).toBe(500);
      expect(StatusCode.NotImplemented).toBe(501);
      expect(StatusCode.BadGateway).toBe(502);
      expect(StatusCode.ServiceUnavailable).toBe(503);
    });
  });
});

// End of unit tests for: StatusCode enum

