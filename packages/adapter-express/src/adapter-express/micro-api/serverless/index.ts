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
} from "./aws-lambda.adapter.js";

export {
  vercelAdapter,
  type VercelRequest,
  type VercelResponse,
  type VercelHandler,
  type VercelAdapterConfig,
} from "./vercel.adapter.js";

export {
  cloudflareAdapter,
  type CloudflareEnv,
  type CloudflareContext,
  type CloudflareRequest,
  type CloudflareRequestContext,
  type CloudflareHandler,
  type CloudflareAdapterConfig,
} from "./cloudflare.adapter.js";

export {
  cloudflareBindings,
  CloudflareBindingNotFoundError,
  type CloudflareBindingKind,
  type CloudflareBindingToken,
  type CloudflareBindings,
  type CloudflareServices,
} from "./cloudflare-bindings.js";
