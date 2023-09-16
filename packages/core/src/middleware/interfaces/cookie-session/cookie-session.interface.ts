import { Keygrip } from "./keygrip.interface";

interface CookieSessionOptions {
  /**
   * The name of the cookie to set, defaults to session.
   */
  name?: string | undefined;

  /**
   * The list of keys to use to sign & verify cookie values. Set cookies are always signed with keys[0], while the other keys are valid for verification, allowing for key rotation.
   */
  keys: Array<string> | Keygrip;

  /**
   * A string which will be used as single key if keys is not provided.
   */
  secret?: string | undefined;

  /**
   * a number representing the milliseconds from Date.now() for expiry.
   */
  maxAge?: number | undefined;

  /**
   * a Date object indicating the cookie's expiration date (expires at the end of session by default).
   */
  expires?: Date | undefined;

  /**
   * a string indicating the path of the cookie (/ by default).
   */
  path?: string | undefined;

  /**
   * a string indicating the domain of the cookie (no default).
   */
  domain?: string | undefined;

  /**
   * a boolean or string indicating whether the cookie is a "same site" cookie (false by default). This can be set to 'strict', 'lax', 'none', or true (which maps to 'strict').
   */
  sameSite?: "strict" | "lax" | "none" | boolean | undefined;

  /**
   * a boolean indicating whether the cookie is only to be sent over HTTPS (false by default for HTTP, true by default for HTTPS).
   */
  secure?: boolean | undefined;

  /**
   * a boolean indicating whether the cookie is only to be sent over HTTPS (use this if you handle SSL not in your node process).
   */
  secureProxy?: boolean | undefined;

  /**
   * a boolean indicating whether the cookie is only to be sent over HTTP(S), and not made available to client JavaScript (true by default).
   */
  httpOnly?: boolean | undefined;

  /**
   * a boolean indicating whether the cookie is to be signed (true by default). If this is true, another cookie of the same name with the .sig suffix appended will also be sent, with a 27-byte url-safe base64 SHA1 value representing the hash of cookie-name=cookie-value against the
   * first Keygrip key. This signature key is used to detect tampering the next time a cookie is received.
   */
  signed?: boolean | undefined;

  /**
   * a boolean indicating whether to overwrite previously set cookies of the same name (true by default). If this is true, all cookies set during the same request with the same name (regardless of path or domain) are filtered out of the Set-Cookie header when setting this cookie.
   */
  overwrite?: boolean | undefined;
}

export { CookieSessionOptions };
