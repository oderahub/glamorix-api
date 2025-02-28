import { HTTP_STATUS_CODES, ERROR_MESSAGES, ERROR_TYPES } from '../config/constants.js';
import { logger } from '../utils/logger.js'

export const errorHandler = (err, req, res, next) => {
    let statusCode = HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;
    let message = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
    let errorType = ERROR_TYPES.SERVER;

    // Determine error type and appropriate response
    if (err.name === 'ValidationError') {
        statusCode = HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY;
        message = err.message || ERROR_MESSAGES.VALIDATION_ERROR;
        errorType = ERROR_TYPES.VALIDATION;
    }

    // Log the error
    logger.error(`[${errorType}] ${message}:`, err);

    // Send response
    return res.status(statusCode).json({
        success: false,
        message,
        errorType,
        errors: err.errors || null
    });
};