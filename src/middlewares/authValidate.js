import { ERROR_MESSAGES } from '../constants/constant.js'

export const validateRequest = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false })
  if (error) {
    return res.status(400).json({
      error: ERROR_MESSAGES.VALIDATION_ERROR,
      details: error.details.map((detail) => detail.message)
    })
  }
  next()
}
