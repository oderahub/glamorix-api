import express from 'express';
import { authenticateToken } from '../utils/authMiddleware.js';
import {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  checkWishlistStatus,
  clearWishlist,
} from '../controllers/wishlistController.js';
import { validateRequest } from '../middlewares/authValidate.js';
import Joi from 'joi';

const router = express.Router();

// Wishlist schema validation
const wishlistAddSchema = Joi.object({
  productId: Joi.string().uuid().required(),
});

// All wishlist routes require authentication
router.use(authenticateToken);

// Add product to wishlist
router.post('/wishlist', validateRequest(wishlistAddSchema), addToWishlist);

// Remove product from wishlist
router.delete('/wishlist/:productId', removeFromWishlist);

// Get user's wishlist
router.get('/wishlist', getWishlist);

// Check if a product is in the user's wishlist
router.get('/wishlist/check/:productId', checkWishlistStatus);

// Clear entire wishlist
router.delete('/wishlist', clearWishlist);

export default router;
