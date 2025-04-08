import express from 'express';
import {
  addReview,
  getProductReviews,
  getProductReviewStats,
  getUserProductReview,
  deleteReview,
  adminGetAllReviews,
  adminApproveReview,
  adminRejectReview,
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

// Admin routes
router.get('/admin/reviews', isAuthenticated, isAdmin, adminGetAllReviews);
router.patch('/admin/reviews/:reviewId/approve', isAuthenticated, isAdmin, adminApproveReview);
router.delete('/admin/reviews/:reviewId', isAuthenticated, isAdmin, adminRejectReview);

export default router;
