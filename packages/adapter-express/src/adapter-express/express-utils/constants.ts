export const TYPE = {
  AuthProvider: Symbol.for("AuthProvider"),
  Controller: Symbol.for("Controller"),
  HttpContext: Symbol.for("HttpContext"),
};

export const METADATA_KEY = {
  controller: "inversify-express-utils:controller",
  controllerMethod: "inversify-express-utils:controller-method",
  controllerParameter: "inversify-express-utils:controller-parameter",
  httpContext: "inversify-express-utils:httpcontext",
  version: "inversify-express-utils:version",
  accept: "inversify-express-utils:accept",
  consumes: "inversify-express-utils:consumes",
  produces: "inversify-express-utils:produces",
  csvOptions: "inversify-express-utils:csv-options",
  xmlOptions: "inversify-express-utils:xml-options",
  yamlOptions: "inversify-express-utils:yaml-options",
  streamResponse: "inversify-express-utils:stream-response",
};

export const HTTP_CODE_METADATA = {
  httpCode: "inversify-express-utils:httpcode",
  statusCode: "inversify-express-utils:statuscode",
  path: "inversify-express-utils:path",
};

export const RENDER_METADATA_KEY = Symbol("Render");

export enum PARAMETER_TYPE {
  REQUEST,
  RESPONSE,
  PARAMS,
  QUERY,
  BODY,
  HEADERS,
  COOKIES,
  NEXT,
  PRINCIPAL,
}

export enum HTTP_VERBS_ENUM {
  all = "ALL",
  connect = "CONNECT",
  delete = "DELETE",
  get = "GET",
  head = "HEAD",
  options = "OPTIONS",
  patch = "PATCH",
  post = "POST",
  propfind = "PROPFIND",
  put = "PUT",
  trace = "TRACE",
}

export const DUPLICATED_CONTROLLER_NAME = (name: string): string =>
  `Two controllers cannot have the same name: ${name}`;

export const NO_CONTROLLERS_FOUND =
  "No controller found! Please ensure that you have register at least one Controller.";

export const DEFAULT_ROUTING_ROOT_PATH = "/";
