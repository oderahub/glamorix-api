import jwt from 'jsonwebtoken'
import { HTTP_STATUS_CODES, ERROR_MESSAGES } from '../constants/constant.js'
import ApiResponse from '../utils/ApiResponse.js'

export const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]
  if (!token) {
    return ApiResponse.error(res, ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS_CODES.UNAUTHORIZED)
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return ApiResponse.error(res, ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS_CODES.UNAUTHORIZED)
    }
    req.user = user
    next()
  })
}

export const requireRole = (role) => (req, res, next) => {
  if (req.user.role !== role) {
    return ApiResponse.error(res, ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS_CODES.FORBIDDEN)
  }
  next()
}
