/**
 * Stub for iconv-lite on Cloudflare Workers, aliased in by wrangler.toml and
 * vitest.config.mts. Express body parsing is disabled on this target, so
 * none of these can legitimately run.
 */
const UNSUPPORTED =
  "iconv-lite is not available on Cloudflare Workers. Read parsed data from req.body instead.";

function unsupported() {
  throw new Error(UNSUPPORTED);
}

module.exports = {
  encodingExists: unsupported,
  decode: unsupported,
  encode: unsupported,
  getDecoder: unsupported,
  getEncoder: unsupported,
};
