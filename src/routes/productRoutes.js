import express from 'express';
import { authenticateToken, requireRole } from '../utils/authMiddleware.js';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  archiveProduct,
  restoreProduct,
} from '../controllers/productController.js';
import { productSchema, updateProductSchema } from '../validations/index.js';
import { validateRequest } from '../middlewares/authValidate.js';
//import {uploadImage} from '../middlewares/authValidate.js';
import { Product, Category, ProductVariant } from '../models/index.js';
import ApiResponse from '../utils/ApiResponse.js';
import { HTTP_STATUS_CODES, ERROR_MESSAGES, ROLES, PRODUCT_STATUS } from '../constants/constant.js';
import { Op } from 'sequelize';
import Joi from 'joi';

const router = express.Router();

router.post(
  '/admin/products',
  authenticateToken,
  requireRole(ROLES.ADMIN),
  validateRequest(productSchema),
  createProduct,
);
router.patch(
  '/admin/products/:id',
  authenticateToken,
  requireRole(ROLES.ADMIN),
  validateRequest(updateProductSchema),
  updateProduct,
);
router.delete('/admin/products/:id', authenticateToken, requireRole(ROLES.ADMIN), deleteProduct);
router.patch(
  '/admin/products/:id/stock',
  authenticateToken,
  requireRole(ROLES.ADMIN),
  validateRequest(Joi.object({ stockQuantity: Joi.number().integer().min(0).required() })),
  updateStock,
);
router.patch(
  '/admin/products/:id/archive',
  authenticateToken,
  requireRole(ROLES.ADMIN),
  archiveProduct,
);
router.patch(
  '/admin/products/:id/restore',
  authenticateToken,
  requireRole(ROLES.ADMIN),
  restoreProduct,
);

// Public product endpoints with pagination and filters
router.get('/products', async (req, res, next) => {
  try {
    const {
      limit = 10,
      offset = 0,
      categoriesId,
      isActive = PRODUCT_STATUS.ACTIVE,
      minPrice,
      maxPrice,
      sort = 'createdAt_desc',
    } = req.query;
    const where = {};
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }

    let order = [['createdAt', 'DESC']];
    if (sort === 'price_asc') order = [['price', 'ASC']];
    if (sort === 'price_desc') order = [['price', 'DESC']];

    const products = await Product.findAll({
      where,
      include: [
        { model: Category, as: 'categories', through: { attributes: [] } },
        { model: ProductVariant, as: 'variants' },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order,
      paranoid: false,
    });
    const total = await Product.count({ where });
    return ApiResponse.success(res, 'Products retrieved', {
      products,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/products/:id', async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: Category, as: 'categories', through: { attributes: [] } },
        { model: ProductVariant, as: 'variants' },
      ],
      paranoid: false,
    });
    if (!product) {
      return ApiResponse.error(res, ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }
    return ApiResponse.success(res, 'Product details', product);
  } catch (error) {
    next(error);
  }
});

router.get('/products/category/:id', async (req, res, next) => {
  try {
    const { limit = 10, offset = 0, isActive = true, sort = 'createdAt_desc' } = req.query;
    let order = [['createdAt', 'DESC']];
    if (sort === 'price_asc') order = [['price', 'ASC']];
    if (sort === 'price_desc') order = [['price', 'DESC']];

    const products = await Product.findAll({
      include: [
        {
          model: Category,
          as: 'categories',
          where: { id: req.params.id, ...(isActive ? { isActive } : {}) },
          through: { attributes: [] },
          paranoid: false,
        },
        { model: ProductVariant, as: 'variants' },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order,
    });
    const total = await Product.count({
      include: [
        {
          model: Category,
          as: 'categories',
          where: { id: req.params.id, ...(isActive ? { isActive } : {}) },
          paranoid: false,
        },
      ],
    });
    return ApiResponse.success(res, 'Products by category', {
      products,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
