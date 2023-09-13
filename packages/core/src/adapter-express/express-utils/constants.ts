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
};

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
  "No controllers" +
  "have been found! Please ensure that you have register" +
  "at least one Controller.";

export const DEFAULT_ROUTING_ROOT_PATH = "/";
