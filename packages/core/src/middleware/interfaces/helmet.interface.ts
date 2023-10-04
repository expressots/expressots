import { Request, Response } from "express";
/**
 * @typedef {string} cspDirectiveValue
 * Possible values for Content Security Policy directives.
 * Can be 'self', 'none', or a string.
 */
type cspDirectiveValue = "self" | "none" | string;

/**
 * @interface directiveOptions
 * Options for defining Content Security Policy directives.
 */
interface directiveOptions {
  "default-src"?:
    | Array<cspDirectiveValue>
    | null
    | Array<(req: Request, res: Response) => string>;
  "base-uri"?:
    | Array<cspDirectiveValue>
    | null
    | Array<(req: Request, res: Response) => string>;
  "font-src"?:
    | Array<cspDirectiveValue>
    | null
    | Array<(req: Request, res: Response) => string>;
  "form-action"?:
    | Array<cspDirectiveValue>
    | null
    | Array<(req: Request, res: Response) => string>;
  "frame-ancestors"?:
    | Array<cspDirectiveValue>
    | null
    | Array<(req: Request, res: Response) => string>;
  "img-src"?:
    | Array<cspDirectiveValue>
    | null
    | Array<(req: Request, res: Response) => string>;
  "object-src"?:
    | Array<cspDirectiveValue>
    | null
    | Array<(req: Request, res: Response) => string>;
  "script-src"?:
    | Array<cspDirectiveValue>
    | null
    | Array<(req: Request, res: Response) => string>;
  "script-src-attr"?:
    | Array<cspDirectiveValue>
    | null
    | Array<(req: Request, res: Response) => string>;
  "style-src"?:
    | Array<cspDirectiveValue>
    | null
    | Array<(req: Request, res: Response) => string>;
  "upgrade-insecure-requests"?:
    | Array<cspDirectiveValue>
    | null
    | Array<(req: Request, res: Response) => string>;
}

/**
 * @interface ContentSecurityPolicy
 * Defines a Content Security Policy configuration.
 */
interface ContentSecurityPolicy {
  /**
   * A function that sets Content Security Policy.
   *
   * @param {directiveOptions} options - Optional configuration options for Content Security Policy.
   * @returns {Function} A middleware function.
   */
  useDefaults?: false;
  // directives?: DEFAULT_DIRECTIVES,
  directives?: directiveOptions;
  reportOnly?: boolean;
}

/**
 * @typedef {Object} CrossOriginEmbedderPolicyOptions
 * An optional policy for Cross-Origin Embedder Policy.
 */
interface CrossOriginEmbedderPolicyOptions {
  /**
   * An optional policy for Cross-Origin Embedder Policy.
   */
  policy?: "require-corp" | "credentialless";
}

/**
 * @typedef {Object} CrossOriginOpenerPolicyOptions
 * An optional policy for Cross-Origin Opener Policy.
 */
interface CrossOriginOpenerPolicyOptions {
  /**
   * An optional policy for Cross-Origin Opener Policy.
   */
  policy?: "same-origin" | "same-origin-allow-popups" | "unsafe-none";
}

/**
 * @typedef {Object} CrossOriginResourcePolicyOptions
 * An optional policy for Cross-Origin Resource Policy.
 */
interface CrossOriginResourcePolicyOptions {
  /**
   * An optional policy for Cross-Origin Resource Policy.
   */
  policy?: "same-origin" | "same-site" | "cross-origin";
}

/**
 * @typedef {string} ReferrerPolicyToken
 * A type alias for Referrer Policy tokens.
 */
type ReferrerPolicyToken =
  | "no-referrer"
  | "no-referrer-when-downgrade"
  | "no-referrer"
  | "no-referrer-when-downgrade"
  | "same-origin"
  | "origin"
  | "strict-origin"
  | "origin-when-cross-origin"
  | "strict-origin-when-cross-origin"
  | "unsafe-url"
  | "";

/**
 * @typedef {Object} ReferrerPolicyOptions
 * An optional policy for Referrer Policy.
 */
interface ReferrerPolicyOptions {
  /**
   * An optional policy for Referrer Policy.
   */
  policy?: ReferrerPolicyToken | Array<ReferrerPolicyToken> | false;
}

/**
 * @typedef {Object} StrictTransportSecurityOptions
 * Options for Strict Transport Security.
 */
interface StrictTransportSecurityOptions {
  /**
   * An optional max age for Strict Transport Security.
   */
  maxAge?: number;

  /**
   * An optional flag to include subdomains.
   */
  includeSubDomains?: boolean;

  /**
   * An optional flag for preload.
   */
  preload?: boolean;
}

/**
 * @typedef {boolean|string} xContentTypeOptions
 * Options for X-Content-Type-Options.
 */
type xContentTypeOptions = false | "nosniff";

/**
 * @typedef {Object} XDnsPrefetchControlOptions
 * Options for X-DNS-Prefetch-Control.
 */
interface XDnsPrefetchControlOptions {
  /**
   * An optional flag to allow DNS prefetching.
   */
  allow?: boolean;
}

/**
 * @typedef {Object} XFrameOptionsOptions
 * Options for X-Frame-Options.
 */
interface XFrameOptionsOptions {
  /**
   * An optional action for X-Frame-Options.
   */
  action?: "deny" | "sameorigin" | false;
}

/**
 * @typedef {Object} XPermittedCrossDomainPoliciesOptions
 * Options for X-Permitted-Cross-Domain-Policies.
 */
interface XPermittedCrossDomainPoliciesOptions {
  /**
   * An optional policy for X-Permitted-Cross-Domain-Policies.
   */
  permittedPolicies?: "none" | "master-only" | "by-content-type" | "all";
}

/**
 * @typedef {boolean} xPoweredByOptions
 * Options for X-Powered-By.
 */
type xPoweredByOptions = false;

/**
 * @typedef {boolean} xXssProtectionOptions
 * Options for X-XSS-Protection.
 */
type xXssProtectionOptions = false;

/**
 * @interface OptionsHelmet
 * Options for Helmet middleware.
 */
export interface OptionsHelmet {
  /**
   * An optional Content Security Policy.
   */
  contentSecurityPolicy?: ContentSecurityPolicy | false;

  /**
   * An optional Cross-Origin Embedder Policy.
   */
  crossOriginEmbedderPolicy?: CrossOriginEmbedderPolicyOptions | boolean;

  /**
   * An optional Cross-Origin Opener Policy.
   */
  crossOriginOpenerPolicy?: boolean | CrossOriginOpenerPolicyOptions;

  /**
   * An optional Cross-Origin Resource Policy.
   */
  crossOriginResourcePolicy?: boolean | CrossOriginResourcePolicyOptions;

  /**
   * An optional flag for originAgentCluster.
   */
  originAgentCluster?: false;

  /**
   * An optional Referrer Policy.
   */
  referrerPolicy?: ReferrerPolicyOptions;

  /**
   * An optional Strict Transport Security.
   */
  strictTransportSecurity?: StrictTransportSecurityOptions;

  /**
   * An optional X-Content-Type-Options.
   */
  xContentTypeOptions?: xContentTypeOptions;

  /**
   * An optional X-DNS-Prefetch-Control.
   */
  xDnsPrefetchControl?: XDnsPrefetchControlOptions;

  /**
   * An optional X-Download-Options.
   */
  xDownloadOptions?: boolean | "noopen";

  /**
   * An optional X-Frame-Options.
   */
  xFrameOptions?: XFrameOptionsOptions;

  /**
   * An optional X-Permitted-Cross-Domain-Policies.
   */
  xPermittedCrossDomainPolicies?: XPermittedCrossDomainPoliciesOptions;

  /**
   * An optional X-Powered-By.
   */
  xPoweredBy?: xPoweredByOptions;

  /**
   * An optional X-XSS-Protection.
   */
  xXssProtection?: xXssProtectionOptions;
}
