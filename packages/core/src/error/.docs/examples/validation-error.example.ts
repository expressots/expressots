/**
 * Validation Error Example
 *
 * This example demonstrates handling validation errors with AppError.
 *
 * @example
 * ```bash
 * # Run this example
 * ts-node examples/validation-error.example.ts
 * ```
 */

import { AppError, type ValidationError } from "../index";

// Example 1: Simple validation error
function example1() {
  console.log("Example 1: Simple validation error");

  const errors: ValidationError[] = [
    { property: "email", messages: ["Invalid email format"] },
    {
      property: "password",
      messages: ["Password must be at least 8 characters"],
    },
  ];

  try {
    throw AppError.validationFailed(errors);
  } catch (error) {
    if (error instanceof AppError) {
      console.log("Status Code:", error.statusCode);
      console.log("Message:", error.message);
      console.log(
        "Validation Errors:",
        JSON.stringify(error.validationErrors, null, 2),
      );
      console.log(
        "Problem Details:",
        JSON.stringify(error.toProblemDetails(), null, 2),
      );
    }
  }
}

// Example 2: Validation error with values
function example2() {
  console.log("\nExample 2: Validation error with values");

  const errors: ValidationError[] = [
    { property: "age", messages: ["Must be 18 or older"], value: 15 },
    {
      property: "email",
      messages: ["Invalid email format"],
      value: "invalid-email",
    },
  ];

  try {
    throw AppError.validationFailed(errors);
  } catch (error) {
    if (error instanceof AppError) {
      console.log(
        "Validation Errors:",
        JSON.stringify(error.validationErrors, null, 2),
      );
    }
  }
}

// Example 3: Multiple messages per property
function example3() {
  console.log("\nExample 3: Multiple messages per property");

  const errors: ValidationError[] = [
    {
      property: "password",
      messages: [
        "Password must be at least 8 characters",
        "Password must contain at least one uppercase letter",
        "Password must contain at least one number",
      ],
      value: "weak",
    },
  ];

  try {
    throw AppError.validationFailed(errors);
  } catch (error) {
    if (error instanceof AppError) {
      console.log(
        "Validation Errors:",
        JSON.stringify(error.validationErrors, null, 2),
      );
    }
  }
}

// Example 4: Form validation helper
function validateUserForm(data: {
  email?: string;
  age?: number;
  password?: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.email) {
    errors.push({ property: "email", messages: ["Email is required"] });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push({
      property: "email",
      messages: ["Invalid email format"],
      value: data.email,
    });
  }

  if (!data.age) {
    errors.push({ property: "age", messages: ["Age is required"] });
  } else if (data.age < 18) {
    errors.push({
      property: "age",
      messages: ["Must be 18 or older"],
      value: data.age,
    });
  }

  if (!data.password) {
    errors.push({ property: "password", messages: ["Password is required"] });
  } else if (data.password.length < 8) {
    errors.push({
      property: "password",
      messages: ["Password must be at least 8 characters"],
      value: data.password,
    });
  }

  return errors;
}

// Example 5: Using validation helper
function example5() {
  console.log("\nExample 5: Using validation helper");

  const formData = {
    email: "invalid-email",
    age: 15,
    password: "weak",
  };

  const errors = validateUserForm(formData);

  if (errors.length > 0) {
    try {
      throw AppError.validationFailed(errors);
    } catch (error) {
      if (error instanceof AppError) {
        console.log("Form Data:", formData);
        console.log(
          "Validation Errors:",
          JSON.stringify(error.validationErrors, null, 2),
        );
        console.log(
          "Problem Details:",
          JSON.stringify(error.toProblemDetails(), null, 2),
        );
      }
    }
  }
}

// Run examples
if (require.main === module) {
  example1();
  example2();
  example3();
  example5();
}

export { example1, example2, example3, example5, validateUserForm };
