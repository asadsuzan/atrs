# `server/src/utils/httpError.ts`
**Purpose:** Factory for `Error` objects that carry an HTTP status code, understood by the central Express error handler.
**Language / Size:** TypeScript / 349 bytes

## Exports
- `interface HttpError extends Error { statusCode: number }`
- `default function createHttpError(statusCode: number, message: string): HttpError`

## Imports (Internal / External)
- None.

## Functions / Methods
### `createHttpError(statusCode, message)`
Creates a standard `Error` with `message`, casts it to `HttpError`, sets `err.statusCode = statusCode`, and returns it.

## Data structures / Types / Constants
- `HttpError`: an `Error` augmented with a numeric `statusCode`.

## Important algorithms
None — trivial factory.

## Relationships
Used pervasively across utils and routes (e.g. `github.ts`, `ownership.ts`, `repoAccess.ts`) to throw errors with a specific HTTP status. The Express error-handling middleware reads `statusCode` to set the response status.

## Edge cases & known limitations
- No validation of `statusCode`; any number is accepted.
- Errors created here rely on the global error handler to translate `statusCode` into a response.
