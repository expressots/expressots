/**
 * Metadata keys for interceptor decorators
 */
export const INTERCEPTOR_METADATA_KEY = {
  /**
   * Key for @Interceptor() decorator metadata
   */
  interceptor: "expressots:interceptor",

  /**
   * Key for controller-level interceptors via @UseInterceptors()
   */
  controllerInterceptors: "expressots:controller_interceptors",

  /**
   * Key for method-level interceptors via @UseInterceptors()
   */
  methodInterceptors: "expressots:method_interceptors",
} as const;
