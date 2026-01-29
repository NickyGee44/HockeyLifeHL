/**
 * API Error Handling Utilities
 *
 * Standardized error responses for BMHL Schedule Management APIs.
 */

import { NextResponse } from "next/server";

/**
 * Structured API error with status code and error code
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Standard error response format
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Handle API errors and return appropriate NextResponse
 *
 * @param error - Error object (ApiError, Error, or unknown)
 * @returns NextResponse with error details
 */
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  console.error("[API Error]", error);

  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    // Check for specific database errors
    if (error.message.includes("serialization")) {
      return NextResponse.json(
        {
          error: {
            code: "CONCURRENT_MODIFICATION",
            message:
              "This resource was modified by another request. Please retry.",
          },
        },
        { status: 409 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again.",
          details: process.env.NODE_ENV === "development" ? error.message : undefined,
        },
      },
      { status: 500 }
    );
  }

  // Unknown error type
  return NextResponse.json(
    {
      error: {
        code: "UNKNOWN_ERROR",
        message: "An unexpected error occurred. Please try again.",
      },
    },
    { status: 500 }
  );
}

/**
 * Common error responses
 */
export const ErrorResponses = {
  unauthorized: () =>
    new ApiError(401, "UNAUTHORIZED", "Authentication required"),

  forbidden: () =>
    new ApiError(
      403,
      "FORBIDDEN",
      "You do not have permission to perform this action"
    ),

  notFound: (resource: string = "Resource") =>
    new ApiError(404, "NOT_FOUND", `${resource} not found`),

  badRequest: (message: string) =>
    new ApiError(400, "BAD_REQUEST", message),

  conflict: (message: string, details?: unknown) =>
    new ApiError(409, "CONFLICT", message, details),

  invalidTenant: () =>
    new ApiError(404, "INVALID_TENANT", "League not found or access denied"),

  gameNotReschedulable: (reason: string) =>
    new ApiError(
      400,
      "GAME_NOT_RESCHEDULABLE",
      `Cannot reschedule game: ${reason}`
    ),

  schedulingConflict: (conflicts: unknown) =>
    new ApiError(
      409,
      "SCHEDULING_CONFLICT",
      "Scheduling conflicts detected",
      conflicts
    ),
};
