/**
 * Basic Error Handling Example
 *
 * This example demonstrates basic error handling with AppError.
 *
 * @example
 * ```bash
 * # Run this example
 * ts-node examples/basic-error.example.ts
 * ```
 */

import { AppError, StatusCode } from "../index";

// Example 1: Simple error
function example1() {
  console.log("Example 1: Simple error");
  try {
    throw new AppError("User not found", StatusCode.NotFound);
  } catch (error) {
    if (error instanceof AppError) {
      console.log("Status Code:", error.statusCode);
      console.log("Message:", error.message);
      console.log("Problem Details:", error.toProblemDetails());
    }
  }
}

// Example 2: Using helper methods
function example2() {
  console.log("\nExample 2: Using helper methods");
  try {
    throw AppError.notFound("User", "123");
  } catch (error) {
    if (error instanceof AppError) {
      console.log("Status Code:", error.statusCode);
      console.log("Message:", error.message);
      console.log("Details:", error.details);
    }
  }
}

// Example 3: Error with metadata
function example3() {
  console.log("\nExample 3: Error with metadata");
  try {
    throw new AppError("Invalid input", StatusCode.BadRequest, "UserService", {
      errorCode: "INVALID_INPUT",
      details: { field: "email", value: "invalid-email" },
      requestId: "req-123"
    });
  } catch (error) {
    if (error instanceof AppError) {
      console.log("Status Code:", error.statusCode);
      console.log("Message:", error.message);
      console.log("Service:", error.service);
      console.log("Error Code:", error.errorCode);
      console.log("Details:", error.details);
      console.log("Request ID:", error.requestId);
    }
  }
}

// Example 4: Validation error
function example4() {
  console.log("\nExample 4: Validation error");
  try {
    throw AppError.validationFailed([
      { property: "email", messages: ["Invalid email format"] },
      { property: "age", messages: ["Must be 18 or older"], value: 15 }
    ]);
  } catch (error) {
    if (error instanceof AppError) {
      console.log("Status Code:", error.statusCode);
      console.log("Message:", error.message);
      console.log("Validation Errors:", error.validationErrors);
    }
  }
}

// Run examples
if (require.main === module) {
  example1();
  example2();
  example3();
  example4();
}

export { example1, example2, example3, example4 };

