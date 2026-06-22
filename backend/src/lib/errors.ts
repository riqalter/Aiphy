export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = 'APP_ERROR',
    public details: any = null
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request', details?: any) {
    super(400, message, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: any) {
    super(401, message, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', details?: any) {
    super(403, message, 'FORBIDDEN', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource Not Found', details?: any) {
    super(404, message, 'NOT_FOUND', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource Conflict', details?: any) {
    super(409, message, 'CONFLICT', details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation Failed', details?: any) {
    super(422, message, 'VALIDATION_ERROR', details);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal Server Error', details?: any) {
    super(500, message, 'INTERNAL_SERVER_ERROR', details);
  }
}
