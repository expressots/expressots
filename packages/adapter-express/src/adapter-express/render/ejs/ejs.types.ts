/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * An object where {@link filename} is the final parsed path or {@link template} is the content of the included template
 */
export type IncluderResult =
  | { filename: string; template?: never }
  | { template: string; filename?: never };

/**
 * @param originalPath the path as it appears in the include statement
 * @param parsedPath the previously resolved path
 *
 * @return An {@link IncluderResult} object containing the filename or template data.
 */
type IncluderCallback = (originalPath: string, parsedPath: string) => IncluderResult;

/**
 * Escapes a string using HTML/XML escaping rules.
 *
 * Returns the empty string for `null` or `undefined`.
 *
 * @param markup Input string
 * @return Escaped string
 */
type EscapeCallback = (markup?: any) => string;

export interface Options {
  /**
   * Log the generated JavaScript source for the EJS template to the console.
   *
   * @default false
   */
  debug?: boolean | undefined;

  /**
   * Include additional runtime debugging information in generated template
   * functions.
   *
   * @default true
   */
  compileDebug?: boolean | undefined;

  /**
   * Whether or not to use `with () {}` construct in the generated template
   * functions. If set to `false`, data is still accessible through the object
   * whose name is specified by `ejs.localsName` (defaults to `locals`).
   *
   * @default true
   */
  _with?: boolean | undefined;

  /**
   * Whether to run in strict mode or not.
   * Enforces `_with=false`.
   *
   * @default false
   */
  strict?: boolean | undefined;

  /**
   * An array of local variables that are always destructured from `localsName`,
   * available even in strict mode.
   *
   * @default []
   */
  destructuredLocals?: Array<string> | undefined;

  /**
   * Remove all safe-to-remove whitespace, including leading and trailing
   * whitespace. It also enables a safer version of `-%>` line slurping for all
   * scriptlet tags (it does not strip new lines of tags in the middle of a
   * line).
   *
   * @default false
   */
  rmWhitespace?: boolean | undefined;

  /**
   * Whether or not to compile a `ClientFunction` that can be rendered
   * in the browser without depending on ejs.js. Otherwise, a `TemplateFunction`
   * will be compiled.
   *
   * @default false
   */
  client?: boolean | undefined;

  /**
   * The escaping function used with `<%=` construct. It is used in rendering
   * and is `.toString()`ed in the generation of client functions.
   *
   * @default ejs.escapeXML
   */
  escape?: EscapeCallback | undefined;

  /**
   * The filename of the template. Required for inclusion and caching unless
   * you are using `renderFile`. Also used for error reporting.
   *
   * @default undefined
   */
  filename?: string | undefined;

  /**
   * The path to templates root(s). When this is set, absolute paths for includes
   * (/filename.ejs) will be relative to the templates root(s).
   *
   * @default undefined
   */
  root?: Array<string> | string | undefined;

  /**
   * The opening delimiter for all statements. This allows you to clearly delinate
   * the difference between template code and existing delimiters. (It is recommended
   * to synchronize this with the closeDelimiter property.)
   *
   * @default ejs.openDelimiter
   */
  openDelimiter?: string | undefined;

  /**
   * The closing delimiter for all statements. This allows to to clearly delinate
   * the difference between template code and existing delimiters. (It is recommended
   * to synchronize this with the openDelimiter property.)
   *
   * @default ejs.closeDelimiter
   */
  closeDelimiter?: string | undefined;

  /**
   * Character to use with angle brackets for open/close
   * @default '%'
   */
  delimiter?: string | undefined;

  /**
   * Whether or not to enable caching of template functions. Beware that
   * the options of compilation are not checked as being the same, so
   * special handling is required if, for example, you want to cache client
   * and regular functions of the same file.
   *
   * Requires `filename` to be set. Only works with rendering function.
   *
   * @default false
   */
  cache?: boolean | undefined;

  /**
   * The Object to which `this` is set during rendering.
   *
   * @default this
   */
  context?: any;

  /**
   * Whether or not to create an async function instead of a regular function.
   * This requires language support.
   *
   * @default false
   */
  async?: boolean | undefined;

  /**
   * Make sure to set this to 'false' in order to skip UglifyJS parsing,
   * when using ES6 features (`const`, etc) as UglifyJS doesn't understand them.
   * @default true
   */
  beautify?: boolean | undefined;

  /**
   * Name to use for the object storing local variables when not using `with` or destructuring.
   *
   * @default ejs.localsName
   */
  localsName?: string | undefined;

  /** Set to a string (e.g., 'echo' or 'print') for a function to print output inside scriptlet tags. */
  outputFunctionName?: string | undefined;

  /**
   * An array of paths to use when resolving includes with relative paths
   */
  views?: Array<string> | undefined;

  /**
   * Custom function to handle EJS includes
   */
  includer?: IncluderCallback;
}
