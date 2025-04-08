import express from 'express';
import {
  addReview,
  getProductReviews,
  getProductReviewStats,
  getUserProductReview,
  deleteReview,
  adminGetAllReviews,
  adminDeleteReview,
} from '../controllers/reviewController.js';
import { isAuthenticated } from '../middlewares/auth.js';
import { isAdmin } from '../middlewares/admin.js';

const router = express.Router();

// Customer routes
router.post('/reviews', isAuthenticated, addReview);
router.get('/products/:productId/reviews', getProductReviews);
router.get('/products/:productId/review-stats', getProductReviewStats);
router.get('/products/:productId/my-review', isAuthenticated, getUserProductReview);
router.delete('/reviews/:reviewId', isAuthenticated, deleteReview);

// Admin routes - simplified
router.get('/admin/reviews', isAuthenticated, isAdmin, adminGetAllReviews);
router.delete('/admin/reviews/:reviewId', isAuthenticated, isAdmin, adminDeleteReview);

export default router;
