import express from 'express';
import { authenticateToken, requireRole } from '../utils/authMiddleware.js';
import {
  addReview,
  getProductReviews,
  getUserProductReview,
  deleteReview,
  adminGetAllReviews,
  adminDeleteReview,
  getProductReviewStats,
} from '../controllers/reviewController.js';
import { ROLES } from '../constants/constant.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/products/:productId/reviews', getProductReviews);
// Note: review stats are now handled by the Product model's getReviewStatistics method
router.get('/products/:productId/review-stats', getProductReviewStats);

// Customer routes (authentication required)
router.post('/reviews', authenticateToken, addReview);
router.get('/products/:productId/my-review', authenticateToken, getUserProductReview);
router.delete('/reviews/:reviewId', authenticateToken, deleteReview);

// Admin routes (admin role required)
router.get('/admin/reviews', authenticateToken, requireRole(ROLES.ADMIN), adminGetAllReviews);
router.delete(
  '/admin/reviews/:reviewId',
  authenticateToken,
  requireRole(ROLES.ADMIN),
  adminDeleteReview,
);

export default router;
