/**
 * Serverless Adapters for ExpressoTS Micro Template
 */

export {
  awsLambdaAdapter,
  type LambdaEvent,
  type LambdaContext,
  type LambdaResponse,
  type LambdaHandler,
  type LambdaAdapterConfig,
} from "./aws-lambda.adapter";

export {
  vercelAdapter,
  type VercelRequest,
  type VercelResponse,
  type VercelHandler,
  type VercelAdapterConfig,
} from "./vercel.adapter";

export {
  cloudflareAdapter,
  type CloudflareEnv,
  type CloudflareContext,
  type CloudflareHandler,
  type CloudflareAdapterConfig,
} from "./cloudflare.adapter";
