/// <reference types="node" />
import type { IncomingMessage, ServerResponse } from "http";

/* Define a type for a function that returns a string and takes 'req' and 'res' as parameters */
type ContentSecurityPolicyDirectiveValueFunction = (
  req: IncomingMessage,
  res: ServerResponse,
) => string;

/* Define a type that can either be a string or the above-defined function type */
type ContentSecurityPolicyDirectiveValue =
  | string
  | ContentSecurityPolicyDirectiveValueFunction;

/* Define an interface for Content Security Policy options */
interface ContentSecurityPolicyOptions {
  /**
   * An optional flag to enable default settings.
   */
  useDefaults?: boolean;

  /**
   * Optional directives for Content Security Policy.
   */
  directives?: Record<
    string,
    null | Iterable<ContentSecurityPolicyDirectiveValue>
  >;

  /**
   * An optional flag to set the policy to "report-only" mode.
   */
  reportOnly?: boolean;
}

/* Define an interface for default directives */

interface DEFAULT_DIRECTIVES {
  "default-src"?: Iterable<ContentSecurityPolicyDirectiveValue>;
  "base-uri"?: Iterable<ContentSecurityPolicyDirectiveValue>;
  "font-src"?: Iterable<ContentSecurityPolicyDirectiveValue>;
  "form-action"?: Iterable<ContentSecurityPolicyDirectiveValue>;
  "frame-ancestors"?: Iterable<ContentSecurityPolicyDirectiveValue>;
  "img-src"?: Iterable<ContentSecurityPolicyDirectiveValue>;
  "object-src"?: Iterable<ContentSecurityPolicyDirectiveValue>;
  "script-src"?: Iterable<ContentSecurityPolicyDirectiveValue>;
  "script-src-attr"?: Iterable<ContentSecurityPolicyDirectiveValue>;
  "style-src"?: Iterable<ContentSecurityPolicyDirectiveValue>;
  "font-upgrade-insecure-requests"?: Iterable<ContentSecurityPolicyDirectiveValue>;
}

/* Define an interface for Content Security Policy */
interface ContentSecurityPolicy {
  /**
   * A function that sets Content Security Policy.
   *
   * @param options - Optional configuration options for Content Security Policy.
   * @returns A middleware function.
   */
  (
    options?: Readonly<ContentSecurityPolicyOptions>,
  ): (
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: Error) => void,
  ) => void;

  /**
   * A function to get default directives.
   *
   * @returns Default directives.
   */
  getDefaultDirectives: () => Record<string, Iterable<DEFAULT_DIRECTIVES>>;

  /**
   * A unique symbol for disabling default source.
   */
  readonly dangerouslyDisableDefaultSrc: unique symbol;
}

/* Define an interface for Cross-Origin Embedder Policy options */
interface CrossOriginEmbedderPolicyOptions {
  /**
   * An optional policy for Cross-Origin Embedder Policy.
   */
  policy?: "require-corp" | "credentialless";
}

/* Define an interface for Cross-Origin Opener Policy options */
interface CrossOriginOpenerPolicyOptions {
  /**
   * An optional policy for Cross-Origin Opener Policy.
   */
  policy?: "same-origin" | "same-origin-allow-popups" | "unsafe-none";
}

/* Define an interface for Cross-Origin Resource Policy options */
interface CrossOriginResourcePolicyOptions {
  /**
   * An optional policy for Cross-Origin Resource Policy.
   */
  policy?: "same-origin" | "same-site" | "cross-origin";
}

/* Define a type alias for Referrer Policy tokens */
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

/* Define an interface for Referrer Policy options */
interface ReferrerPolicyOptions {
  /**
   * An optional policy for Referrer Policy.
   */
  policy?: ReferrerPolicyToken | Array<ReferrerPolicyToken> | false;
}

/* Define an interface for Strict Transport Security options */
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

/* Define a type alias for xContentTypeOptions */
type xContentTypeOptions = false | "nosniff";

/* Define an interface for X-DNS-Prefetch-Control options */
interface XDnsPrefetchControlOptions {
  /**
   * An optional flag to allow DNS prefetching.
   */
  allow?: boolean;
}

/* Define an interface for X-Frame-Options options */
interface XFrameOptionsOptions {
  /**
   * An optional action for X-Frame-Options.
   */
  action?: "deny" | "sameorigin" | false;
}

/* Define an interface for X-Permitted-Cross-Domain-Policies options */
interface XPermittedCrossDomainPoliciesOptions {
  /**
   * An optional policy for X-Permitted-Cross-Domain-Policies.
   */
  permittedPolicies?: "none" | "master-only" | "by-content-type" | "all";
}

/* Define a type alias for xPoweredByOptions */
type xPoweredByOptions = false;

/* Define a type alias for xXssProtectionOptions */
type xXssProtectionOptions = false;

/* Define an interface for Helmet options */
export interface OptionsHelmet {
  /**
   * An optional Content Security Policy.
   */
  contentSecurityPolicy?: ContentSecurityPolicy;

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
