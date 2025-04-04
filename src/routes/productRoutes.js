import express from 'express';
import { authenticateToken, requireRole } from '../utils/authMiddleware.js';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  archiveProduct,
  restoreProduct,
  addProductImages,
  getProductImage,
  getAllProducts,
  getProductById,
  getProductsByCategory
} from '../controllers/productController.js';
import { productSchema, updateProductSchema } from '../validations/index.js';
import { validateRequest } from '../middlewares/authValidate.js';
import { ROLES } from '../constants/constant.js';
import Joi from 'joi';
import multer from 'multer';
import { parseMultipartArrays } from '../utils/helper.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and GIF images are allowed'));
    }
    cb(null, true);
  }
});

// Public routes - these don't require authentication
router.get('/products', getAllProducts);
router.get('/products/:id', getProductById);
router.get('/products/category/:id', getProductsByCategory);
router.get('/products/images/:imageId', getProductImage);

// Admin routes - require authentication and admin role
router.post(
  '/admin/products/:productId/images',
  authenticateToken,
  requireRole(ROLES.ADMIN),
  upload.array('images', 10),
  addProductImages
);

router.post(
  '/admin/products',
  authenticateToken,
  requireRole(ROLES.ADMIN),
  upload.array('images', 10),
  parseMultipartArrays,
  validateRequest(productSchema),
  createProduct
);

router.patch(
  '/admin/products/:id',
  authenticateToken,
  requireRole(ROLES.ADMIN),
  upload.array('images', 10),
  parseMultipartArrays,
  validateRequest(updateProductSchema),
  updateProduct
);

router.delete(
  '/admin/products/:id',
  authenticateToken,
  requireRole(ROLES.ADMIN),
  deleteProduct
);

router.patch(
  '/admin/products/:id/stock',
  authenticateToken,
  requireRole(ROLES.ADMIN),
  validateRequest(Joi.object({ stockQuantity: Joi.number().integer().min(0).required() })),
  updateStock
);

router.patch(
  '/admin/products/:id/archive',
  authenticateToken,
  requireRole(ROLES.ADMIN),
  archiveProduct
);

router.patch(
  '/admin/products/:id/restore',
  authenticateToken,
  requireRole(ROLES.ADMIN),
  restoreProduct
);

export default router;