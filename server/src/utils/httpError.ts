export interface HttpError extends Error {
  statusCode: number;
}

/** Creates an Error carrying an HTTP status code, understood by the error handler. */
export default function createHttpError(statusCode: number, message: string): HttpError {
  const err = new Error(message) as HttpError;
  err.statusCode = statusCode;
  return err;
}
