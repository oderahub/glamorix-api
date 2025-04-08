import { Review, User, Product, Order, OrderItem } from '../models/index.js';
import ApiResponse from '../utils/ApiResponse.js';
import { HTTP_STATUS_CODES, ERROR_MESSAGES } from '../constants/constant.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';

// Helper function to check if user has purchased a product
// const hasUserPurchasedProduct = async (userId, productId) => {
//   const orders = await Order.findAll({
//     where: {
//       userId,
//       status: { [Op.in]: ['delivered', 'completed'] }, // Only consider completed orders
//     },
//     include: [
//       {
//         model: OrderItem,
//         as: 'items',
//         where: { productId },
//         required: true,
//       },
//     ],
//   });

//   return orders.length > 0;
// };
const hasUserPurchasedProduct = async (userId, productId) => {
  // Update to use your actual order statuses for completed orders
  const completedStatuses = [ORDER_STATUS.DELIVERED, ORDER_STATUS.ACCEPTED];

  const orders = await Order.findAll({
    where: {
      userId,
      status: { [Op.in]: completedStatuses }, // Only consider completed orders
    },
    include: [
      {
        model: OrderItem,
        as: 'items',
        where: { productId },
        required: true,
      },
    ],
  });

  return orders.length > 0;
};

export const addReview = async (req, res, next) => {
  try {
    const { productId, rating, title, comment } = req.body;
    const userId = req.user.id;

    // Validate product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return ApiResponse.error(res, ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    // Check if user has purchased the product
    const hasPurchased = await hasUserPurchasedProduct(userId, productId);
    if (!hasPurchased) {
      return ApiResponse.error(
        res,
        'You can only review products you have purchased',
        HTTP_STATUS_CODES.FORBIDDEN,
      );
    }

    // Check if user has already reviewed this product
    let existingReview = await Review.findOne({
      where: { userId, productId },
    });

    if (existingReview) {
      // Update existing review
      existingReview = await existingReview.update({
        rating,
        title,
        comment,
        isVerifiedPurchase: true,
      });

      return ApiResponse.success(
        res,
        'Review updated successfully',
        existingReview,
        HTTP_STATUS_CODES.OK,
      );
    } else {
      // Create new review
      const newReview = await Review.create({
        userId,
        productId,
        rating,
        title,
        comment,
        isVerifiedPurchase: true,
        isApproved: true, // Auto-approve
      });

      return ApiResponse.success(
        res,
        'Review submitted successfully',
        newReview,
        HTTP_STATUS_CODES.CREATED,
      );
    }
  } catch (error) {
    next(error);
  }
};
// Add or update a review - no approval required
// export const addReview = async (req, res, next) => {
//   try {
//     const { productId, rating, title, comment } = req.body;
//     const userId = req.user.id;

//     // Validate product exists
//     const product = await Product.findByPk(productId);
//     if (!product) {
//       return ApiResponse.error(res, ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
//     }

//     // Check if user has purchased the product
//     const hasPurchased = await hasUserPurchasedProduct(userId, productId);
//     if (!hasPurchased) {
//       return ApiResponse.error(
//         res,
//         'You can only review products you have purchased',
//         HTTP_STATUS_CODES.FORBIDDEN,
//       );
//     }

//     // Check if user has already reviewed this product
//     let existingReview = await Review.findOne({
//       where: { userId, productId },
//     });

//     if (existingReview) {
//       // Update existing review
//       existingReview = await existingReview.update({
//         rating,
//         title,
//         comment,
//         isVerifiedPurchase: true,
//       });

//       return ApiResponse.success(
//         res,
//         'Review updated successfully',
//         existingReview,
//         HTTP_STATUS_CODES.OK,
//       );
//     } else {
//       // Create new review
//       const newReview = await Review.create({
//         userId,
//         productId,
//         rating,
//         title,
//         comment,
//         isVerifiedPurchase: true,
//       });

//       return ApiResponse.success(
//         res,
//         'Review submitted successfully',
//         newReview,
//         HTTP_STATUS_CODES.CREATED,
//       );
//     }
//   } catch (error) {
//     next(error);
//   }
// };

// Get all reviews for a product - no approval filter
export const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { limit = 10, offset = 0, sort = 'newest' } = req.query;

    // Validate product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return ApiResponse.error(res, ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    // Define sorting order
    let order;
    switch (sort) {
      case 'highest':
        order = [['rating', 'DESC']];
        break;
      case 'lowest':
        order = [['rating', 'ASC']];
        break;
      case 'newest':
      default:
        order = [['createdAt', 'DESC']];
    }

    // Get all reviews (no approval filter)
    const reviews = await Review.findAndCountAll({
      where: { productId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id'],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order,
    });

    // Get review statistics directly from the product model
    const stats = await product.getReviewStatistics();

    return ApiResponse.success(
      res,
      'Reviews retrieved successfully',
      {
        reviews: reviews.rows,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: reviews.count,
        },
        stats,
      },
      HTTP_STATUS_CODES.OK,
    );
  } catch (error) {
    next(error);
  }
};

// Get user's review for a specific product
export const getUserProductReview = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    const review = await Review.findOne({
      where: { userId, productId },
    });

    if (!review) {
      return ApiResponse.error(
        res,
        'You have not reviewed this product yet',
        HTTP_STATUS_CODES.NOT_FOUND,
      );
    }

    return ApiResponse.success(res, 'Review retrieved successfully', review, HTTP_STATUS_CODES.OK);
  } catch (error) {
    next(error);
  }
};

// Delete a review
export const deleteReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const review = await Review.findByPk(reviewId);

    if (!review) {
      return ApiResponse.error(res, 'Review not found', HTTP_STATUS_CODES.NOT_FOUND);
    }

    // Check if the review belongs to the user
    if (review.userId !== userId) {
      return ApiResponse.error(
        res,
        'You can only delete your own reviews',
        HTTP_STATUS_CODES.FORBIDDEN,
      );
    }

    await review.destroy();

    return ApiResponse.success(res, 'Review deleted successfully', null, HTTP_STATUS_CODES.OK);
  } catch (error) {
    next(error);
  }
};

// Admin controllers
export const adminGetAllReviews = async (req, res, next) => {
  try {
    const { limit = 10, offset = 0, sort = 'newest' } = req.query;

    // Define sorting order
    let order;
    switch (sort) {
      case 'oldest':
        order = [['createdAt', 'ASC']];
        break;
      case 'highest':
        order = [['rating', 'DESC']];
        break;
      case 'lowest':
        order = [['rating', 'ASC']];
        break;
      case 'newest':
      default:
        order = [['createdAt', 'DESC']];
    }

    const reviews = await Review.findAndCountAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email'],
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'slug'],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order,
    });

    return ApiResponse.success(
      res,
      'Reviews retrieved successfully',
      {
        reviews: reviews.rows,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: reviews.count,
        },
      },
      HTTP_STATUS_CODES.OK,
    );
  } catch (error) {
    next(error);
  }
};

// Admin delete review
export const adminDeleteReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findByPk(reviewId);
    if (!review) {
      return ApiResponse.error(res, 'Review not found', HTTP_STATUS_CODES.NOT_FOUND);
    }

    await review.destroy();

    return ApiResponse.success(res, 'Review deleted successfully', null, HTTP_STATUS_CODES.OK);
  } catch (error) {
    next(error);
  }
};
