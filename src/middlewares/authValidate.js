import { HTTP_STATUS_CODES, ERROR_MESSAGES } from '../constants/constant.js';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage });

export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body || req.query, { abortEarly: false });
    if (error) {
      const errorDetails = error.details.map(detail => ({
        message: detail.message,
        path: detail.path
      }));
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.VALIDATION_ERROR,
        errors: errorDetails
      });
    }
    next();
  };
};


export const uploadCategoryImage = upload.single('image');
// export const uploadImage = upload.single('featuredImage')