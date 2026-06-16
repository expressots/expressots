export interface ResponseSuccess {
  message: string;
}

export interface ResponseSuccessWithModel<T> extends ResponseSuccess {
  model: T;
}

export interface ResponseError extends ResponseSuccess {
  errors?: { [field: string]: string };
}

export interface Meta {
  "x-pagination-current-page": string;
  "x-pagination-page-count": string;
}

export const DEFAULT_META: Meta = Object.freeze({
  "x-pagination-current-page": "1",
  "x-pagination-page-count": "1",
});

export function isMeta(object: unknown): object is Meta {
  return (
    !object ||
    typeof object !== "object" ||
    !Object.keys(DEFAULT_META).every((key) => key in object)
  );
}

export interface BaseParams {
  page?: number | string;
  "per-page"?: number | string;
}
