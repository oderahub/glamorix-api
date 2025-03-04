import express from 'express';
import { authenticateToken } from '../utils/authMiddleware.js';
import { placeOrder, getOrderDetails, getOrderStatus, cancelOrder, getCart, addToCart, updateCart, removeFromCart, checkout } from '../controllers/orderController.js';
import { validateRequest } from '../utils/validationMiddleware.js';
import { cartItemSchema, cartUpdateSchema, checkoutSchema, orderSchema } from '../utils/validationSchemas.js';
import Joi from 'joi';

const router = express.Router();

router.get('/cart', authenticateToken, getCart);
router.post('/cart', authenticateToken, validateRequest(cartItemSchema), addToCart);
router.patch('/cart', authenticateToken, validateRequest(cartUpdateSchema), updateCart);
router.delete('/cart', authenticateToken, validateRequest(cartItemSchema), removeFromCart);
router.post('/cart/checkout', authenticateToken, validateRequest(checkoutSchema), checkout);
router.post('/', authenticateToken, validateRequest(orderSchema), placeOrder);
router.get('/:orderId', authenticateToken, getOrderDetails);
router.get('/status/:orderId', getOrderStatus);
router.post('/cancel/:orderId', authenticateToken, validateRequest(Joi.object({ cancelReason: Joi.string().optional() })), cancelOrder);

export default router;