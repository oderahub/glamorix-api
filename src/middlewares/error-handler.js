import { HTTP_STATUS_CODES, ERROR_MESSAGES, ERROR_TYPES } from '../config/constants.js';
import { logger } from '../utils/logger.js'

export const errorHandler = (err, req, res, next) => {
    let statusCode = HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;
    let message = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
    let errorType = ERROR_TYPES.SERVER;

    switch (err.name) {
        case 'ValidationError':
            statusCode = HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY;
            message = err.message || ERROR_MESSAGES.VALIDATION_ERROR;
            errorType = ERROR_TYPES.VALIDATION;
            break;
        case 'SequelizeUniqueConstraintError':
            statusCode = HTTP_STATUS_CODES.CONFLICT;
            message = ERROR_MESSAGES.EMAIL_ALREADY_EXISTS; // Or dynamic based on field
            errorType = ERROR_TYPES.VALIDATION;
            break;
        case 'UnauthorizedError':
            statusCode = HTTP_STATUS_CODES.UNAUTHORIZED;
            message = ERROR_MESSAGES.UNAUTHORIZED;
            errorType = ERROR_TYPES.AUTHENTICATION;
            break;
    }

    logger.error(`[${errorType}] ${message}:`, err);
    return res.status(statusCode).json({
        success: false,
        message,
        errorType,
        errors: err.errors || null
    });
};