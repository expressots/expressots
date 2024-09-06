/* eslint-disable @typescript-eslint/explicit-function-return-type */
import * as ERROR_MSGS from "../constants/error_msgs";

export function isStackOverflowExeption(error: unknown): error is RangeError {
  return (
    error instanceof RangeError ||
    (error as Error).message === ERROR_MSGS.STACK_OVERFLOW
  );
}

export const tryAndThrowErrorIfStackOverflow = <T>(
  fn: () => T,
  errorCallback: () => Error,
) => {
  try {
    return fn();
  } catch (error) {
    if (isStackOverflowExeption(error)) {
      // eslint-disable-next-line no-ex-assign
      error = errorCallback();
    }
    throw error;
  }
};
