/**
 * Serverless Lambda Example
 *
 * Demonstrates how to deploy an ExpressoTS Micro API to AWS Lambda.
 * The same code works locally for development and on Lambda for production.
 *
 * Deployment:
 * 1. Build: npm run build
 * 2. Package: zip -r function.zip dist/ node_modules/
 * 3. Deploy to AWS Lambda with API Gateway
 *
 * For local development: npm run dev
 */

import { micro, awsLambdaAdapter } from "@expressots/adapter-express";

// Create the micro API
const app = micro({
    showBanner: process.env.AWS_LAMBDA_FUNCTION_NAME ? false : true,
});

// Define your routes
app.get("/", () => {
    return {
        message: "Hello from ExpressoTS Micro on Lambda!",
        environment: process.env.AWS_LAMBDA_FUNCTION_NAME ? "lambda" : "local",
    };
});

app.get("/users", () => {
    return {
        users: [
            { id: 1, name: "Alice" },
            { id: 2, name: "Bob" },
        ],
    };
});

app.get("/users/:id", (req) => {
    return {
        id: req.params.id,
        name: `User ${req.params.id}`,
        requestedAt: new Date().toISOString(),
    };
});

app.post("/users", (req) => {
    return {
        id: Date.now(),
        ...req.body,
        createdAt: new Date().toISOString(),
    };
});

app.get("/health", () => {
    return {
        status: "healthy",
        timestamp: new Date().toISOString(),
        memoryUsage: process.memoryUsage(),
        lambdaContext: process.env.AWS_LAMBDA_FUNCTION_NAME
            ? {
                  functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
                  memoryLimit: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
                  region: process.env.AWS_REGION,
              }
            : null,
    };
});

// Error handling
app.setErrorHandler((err, _req, res) => {
    console.error("Error:", err);
    res.status(500).json({
        error: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
});

// Export for Lambda
// AWS Lambda will call this handler
export const handler = awsLambdaAdapter(app.getApp(), {
    debug: process.env.DEBUG === "true",
    binaryContentTypes: ["application/octet-stream", "image/*"],
});

// Local development
// Only starts the server when running locally (not on Lambda)
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    app.listen(3000, {
        appName: "Lambda Example",
        appVersion: "1.0.0",
    });
}

/**
 * AWS SAM Template Example (template.yaml):
 *
 * AWSTemplateFormatVersion: '2010-09-09'
 * Transform: AWS::Serverless-2016-10-31
 *
 * Resources:
 *   ExpressoTSFunction:
 *     Type: AWS::Serverless::Function
 *     Properties:
 *       Handler: dist/examples/serverless-lambda.example.handler
 *       Runtime: nodejs20.x
 *       MemorySize: 256
 *       Timeout: 30
 *       Events:
 *         Api:
 *           Type: HttpApi
 *           Properties:
 *             Path: /{proxy+}
 *             Method: ANY
 */
