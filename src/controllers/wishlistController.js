import { Wishlist, Product, ProductImage, ProductVariant, Category } from '../models/index.js';
import ApiResponse from '../utils/ApiResponse.js';
import { HTTP_STATUS_CODES, ERROR_MESSAGES } from '../constants/constant.js';

import { transformProductData } from '../utils/productTransformer.js';
//import { Op } from 'sequelize';

export const addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    const userId = req.user.id;

    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return ApiResponse.error(res, ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    // Check if already in wishlist
    const existingWishlistItem = await Wishlist.findOne({
      where: { userId, productId },
    });

    if (existingWishlistItem) {
      return ApiResponse.success(res, 'Product is already in your wishlist', existingWishlistItem);
    }

    // Add to wishlist
    const wishlistItem = await Wishlist.create({
      userId,
      productId,
    });

    return ApiResponse.success(
      res,
      'Product added to wishlist successfully',
      wishlistItem,
      HTTP_STATUS_CODES.CREATED,
    );
  } catch (error) {
    next(error);
  }
};

export const removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    const wishlistItem = await Wishlist.findOne({
      where: { userId, productId },
    });

    if (!wishlistItem) {
      return ApiResponse.error(res, 'Product not found in wishlist', HTTP_STATUS_CODES.NOT_FOUND);
    }

    await wishlistItem.destroy();

    return ApiResponse.success(
      res,
      'Product removed from wishlist successfully',
      null,
      HTTP_STATUS_CODES.NO_CONTENT,
    );
  } catch (error) {
    next(error);
  }
};

export const getWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 10, offset = 0 } = req.query;

    // Get all wishlist items with their associated products
    const wishlistItems = await Wishlist.findAll({
      where: { userId },
      include: [
        {
          model: Product,
          as: 'product',
          include: [
            { model: Category, as: 'categories', through: { attributes: [] } },
            { model: ProductVariant, as: 'variants' },
            {
              model: ProductImage,
              as: 'images',
              attributes: ['id', 'displayOrder', 'isDefault', 'mimeType'],
              order: [['displayOrder', 'ASC']],
            },
          ],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
    });

    const total = await Wishlist.count({ where: { userId } });

    // Transform products to include image URLs
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const transformedWishlist = wishlistItems.map((item) => {
      const wishlistData = item.toJSON();
      if (wishlistData.product) {
        wishlistData.product = transformProductData(wishlistData.product, baseUrl);
      }
      return wishlistData;
    });

    return ApiResponse.success(res, 'Wishlist retrieved successfully', {
      wishlist: transformedWishlist,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    next(error);
  }
};

export const checkWishlistStatus = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    const wishlistItem = await Wishlist.findOne({
      where: { userId, productId },
    });

    return ApiResponse.success(res, 'Wishlist status retrieved', {
      inWishlist: !!wishlistItem,
    });
  } catch (error) {
    next(error);
  }
};

export const clearWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await Wishlist.destroy({
      where: { userId },
    });

    return ApiResponse.success(
      res,
      'Wishlist cleared successfully',
      null,
      HTTP_STATUS_CODES.NO_CONTENT,
    );
  } catch (error) {
    next(error);
  }
};
