/**
 * AWS Lambda Serverless Example
 *
 * This example demonstrates how to deploy the ExpressoTS micro template
 * to AWS Lambda using the serverless-http adapter.
 *
 * Usage:
 *   1. npm install serverless-http
 *   2. Build: npm run build
 *   3. Deploy: serverless deploy
 */

import { createMicroAPI } from "@expressots/adapter-express";
import { Request, Response } from "express";

// ============================================================================
// Create Micro API
// ============================================================================

const microAPI = createMicroAPI();
const app = microAPI.build();

// Configure middleware
app.Middleware.parse();
app.Middleware.security({ cors: true });

// ============================================================================
// Routes
// ============================================================================

app.Route.get("/", (req: Request, res: Response) => {
    res.json({
        message: "Hello from ExpressoTS on Lambda!",
        timestamp: new Date().toISOString(),
    });
});

app.Route.get("/health", (req: Request, res: Response) => {
    res.json({
        status: "healthy",
        platform: "aws-lambda",
        timestamp: new Date().toISOString(),
    });
});

app.Route.get("/users", (req: Request, res: Response) => {
    res.json([
        { id: 1, name: "John Doe" },
        { id: 2, name: "Jane Smith" },
    ]);
});

app.Route.get("/users/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    res.json({ id, name: `User ${id}` });
});

app.Route.post("/users", (req: Request, res: Response) => {
    const { name, email } = req.body;
    res.status(201).json({
        id: Date.now().toString(),
        name,
        email,
        createdAt: new Date().toISOString(),
    });
});

// ============================================================================
// Lambda Handler Export
// ============================================================================

// Get the underlying Express app for serverless-http
const expressApp = (microAPI as any).app;

// For Lambda deployment, use serverless-http
// Note: Install with: npm install serverless-http
let handler: any;

/**
 * Create Lambda handler lazily
 * Install serverless-http with: npm install serverless-http
 */
async function createHandler() {
    if (!handler) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const serverlessHttp = require("serverless-http");
            handler = serverlessHttp(expressApp);
        } catch {
            throw new Error(
                "serverless-http is not installed. Install with: npm install serverless-http"
            );
        }
    }
    return handler;
}

// Export for Lambda
export const lambdaHandler = async (event: unknown, context: unknown) => {
    const h = await createHandler();
    return h(event, context);
};

// For local development
if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 3000;
    app.listen(Number(PORT));
    console.log(`
🚀 Lambda-ready API running locally on http://localhost:${PORT}

Endpoints:
  GET  /         - Hello message
  GET  /health   - Health check
  GET  /users    - List users
  GET  /users/:id - Get user by ID
  POST /users    - Create user

Deploy to Lambda:
  1. npm install serverless-http
  2. npm run build
  3. serverless deploy
`);
}

/*
serverless.yml configuration:

service: expressots-micro-lambda
provider:
    name: aws
    runtime: nodejs20.x
    region: us-east-1
    memorySize: 256
    timeout: 30
    environment:
        NODE_ENV: production

functions:
    api:
        handler: dist/src/examples/serverless-lambda.example.lambdaHandler
        events:
            - httpApi:
                  path: /{proxy+}
                  method: ANY
            - httpApi:
                  path: /
                  method: ANY

plugins:
    - serverless-offline

package:
    patterns:
        - '!node_modules/**'
        - 'node_modules/@expressots/**'
        - 'node_modules/express/**'
        - 'node_modules/serverless-http/**'
        - 'dist/**'
*/
