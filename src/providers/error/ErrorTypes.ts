type ErrorType = GeneralErrorCode | ApplicationErrorCode | HttpStatusErrorCode;
type HttpStatusErrorCode = InformationResponse | SuccessfulResponse | SuccessfulResponse | RedirectionMessage | ClientErrorResponse | ServerErrorResponse;

enum GeneralErrorCode {
    Unknown = 0
}

enum ApplicationErrorCode {
    GeneralAppError = 51,
    LogFolderCreationError = 52
}

/* Http Error Code Response */
enum InformationResponse {
    Continue = 100,
    SwitchingProtocols = 101,
    Processing = 102,
    eEarlyHints = 103,
}

enum SuccessfulResponse {
    OK = 200,
    Created = 201,
    Accepted = 202,
    NonAuthoritativeInformation = 203,
    NoContent = 204,
    ResetContent = 205,
    PartialContent = 206,
    MultiStatus = 207,
    AlreadyReported = 208,
    IMUsed = 226
}

enum RedirectionMessage {
    MultipleChoices = 300,
    MovedPermanently = 301,
    Found = 302,
    SeeOther = 303,
    NotModified = 304,
    TemporaryRedirect = 307,
    PermanentRedirect = 308
}

enum ClientErrorResponse {
    BadRequest = 400,
    Unauthorized = 401,
    PaymentRequired = 402,
    Forbidden = 403,
    NotFound = 404,
    MethodNotAllowed = 405,
    NotAcceptable = 406,
    ProxyAuthenticationRequired = 407,
    RequestTimeout = 408,
    Conflict = 409,
    Gone = 410,
    LengthRequired = 411,
    PreconditionFailed = 412,
    PayloadTooLarge = 413,
    URITooLong = 414,
    UnsupportedMediaType = 415,
    RangeNotSatisfiable = 416,
    ExpectationFailed = 417,
    ImATeapot = 418,
    MisdirectedRequest = 421,
    UnprocessableEntity = 422,
    Locked = 423,
    FailedDependency = 424,
    TooEarly = 425,
    UpgradeRequired = 426,
    PreconditionRequired = 428,
    TooManyRequests = 429,
    RequestHeaderFieldsTooLarge = 431,
    UnavailableForLegalReasons = 451
}

enum ServerErrorResponse {
    InternalServerError = 500,
    NotImplemented = 501,
    BadGateway = 502,
    ServiceUnavailable = 503,
    GatewayTimeout = 504,
    HTTPVersionNotSupported = 505,
    VariantAlsoNegotiates = 506,
    InsufficientStorage = 507,
    LoopDetected = 508,
    NotExtended = 510,
    NetworkAuthenticationRequired = 511
}

const HttpStatusErrorCode = { ...InformationResponse, ...SuccessfulResponse, ...RedirectionMessage, ...ClientErrorResponse, ...ServerErrorResponse };
const AllErrors = { ...GeneralErrorCode, ...ApplicationErrorCode, ...HttpStatusErrorCode };
/* Http Error Code Response */

/* Specific Application Error Code */

// {Add your error enums here}

/* Specific Application Error Code */

export { AllErrors, ErrorType, GeneralErrorCode, ApplicationErrorCode, HttpStatusErrorCode };