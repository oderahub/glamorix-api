import Joi from 'joi'
import { ERROR_MESSAGES, VALIDATION } from '../constants/constant.js'

// User Registration Validation Schema
export const registerSchema = Joi.object({
    email: Joi.string().pattern(VALIDATION.EMAIL_REGEX).required().messages({
        'string.pattern.base': ERROR_MESSAGES.INVALID_USER_DATA,
        'any.required': ERROR_MESSAGES.VALIDATION_ERROR
    }),
    password: Joi.string()
        .pattern(VALIDATION.PASSWORD_REGEX)
        .min(VALIDATION.PASSWORD_MIN_LENGTH)
        .required()
        .messages({
            'string.pattern.base': ERROR_MESSAGES.PASSWORD_TOO_WEAK,
            'string.min': ERROR_MESSAGES.PASSWORD_TOO_WEAK,
            'any.required': ERROR_MESSAGES.VALIDATION_ERROR
        }),
    firstName: Joi.string().min(2).max(50).required().messages({
        'string.min': ERROR_MESSAGES.INVALID_USER_DATA,
        'string.max': ERROR_MESSAGES.INVALID_USER_DATA,
        'any.required': ERROR_MESSAGES.VALIDATION_ERROR
    }),
    lastName: Joi.string().min(2).max(50).required().messages({
        'string.min': ERROR_MESSAGES.INVALID_USER_DATA,
        'string.max': ERROR_MESSAGES.INVALID_USER_DATA,
        'any.required': ERROR_MESSAGES.VALIDATION_ERROR
    }),
    phone: Joi.string().pattern(VALIDATION.PHONE_REGEX).required().messages({
        'string.pattern.base': ERROR_MESSAGES.INVALID_USER_DATA,
        'any.required': ERROR_MESSAGES.VALIDATION_ERROR
    })
})

// Login Validation Schema
export const loginSchema = Joi.object({
    email: Joi.string().pattern(VALIDATION.EMAIL_REGEX).required().messages({
        'string.pattern.base': ERROR_MESSAGES.INVALID_CREDENTIALS,
        'any.required': ERROR_MESSAGES.VALIDATION_ERROR
    }),
    password: Joi.string().required().messages({
        'any.required': ERROR_MESSAGES.VALIDATION_ERROR
    })
})

// OTP Verification Schema
export const otpVerificationSchema = Joi.object({
    userId: Joi.string().required().messages({ 'any.required': ERROR_MESSAGES.VALIDATION_ERROR }),
    otp: Joi.string().length(6).required().messages({
        'string.length': ERROR_MESSAGES.INVALID_OTP,
        'any.required': ERROR_MESSAGES.VALIDATION_ERROR
    })
})

// Forgot Password Schema
export const forgotPasswordSchema = Joi.object({
    email: Joi.string().pattern(VALIDATION.EMAIL_REGEX).required().messages({
        'string.pattern.base': ERROR_MESSAGES.USER_NOT_FOUND,
        'any.required': ERROR_MESSAGES.VALIDATION_ERROR
    })
})

// Reset Password Schema
export const resetPasswordSchema = Joi.object({
    userId: Joi.string().required().messages({ 'any.required': ERROR_MESSAGES.VALIDATION_ERROR }),
    otp: Joi.string().length(6).required().messages({
        'string.length': ERROR_MESSAGES.INVALID_OTP,
        'any.required': ERROR_MESSAGES.VALIDATION_ERROR
    }),
    newPassword: Joi.string()
        .pattern(VALIDATION.PASSWORD_REGEX)
        .min(VALIDATION.PASSWORD_MIN_LENGTH)
        .required()
        .messages({
            'string.pattern.base': ERROR_MESSAGES.PASSWORD_TOO_WEAK,
            'string.min': ERROR_MESSAGES.PASSWORD_TOO_WEAK,
            'any.required': ERROR_MESSAGES.VALIDATION_ERROR
        })
})

// Change Password Schema
export const changePasswordSchema = Joi.object({
    oldPassword: Joi.string()
        .required()
        .messages({ 'any.required': ERROR_MESSAGES.VALIDATION_ERROR }),
    newPassword: Joi.string()
        .pattern(VALIDATION.PASSWORD_REGEX)
        .min(VALIDATION.PASSWORD_MIN_LENGTH)
        .required()
        .messages({
            'string.pattern.base': ERROR_MESSAGES.PASSWORD_TOO_WEAK,
            'string.min': ERROR_MESSAGES.PASSWORD_TOO_WEAK,
            'any.required': ERROR_MESSAGES.VALIDATION_ERROR
        })
})
