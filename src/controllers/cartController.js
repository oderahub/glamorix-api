import sequelize from '../config/database.js';
import { Cart, CartItem, Product, ProductVariant, Order, OrderItem as OrderOrderItem, User } from '../models/index.js';
import ApiResponse from '../utils/ApiResponse.js';
import { HTTP_STATUS_CODES, ERROR_MESSAGES, ORDER_STATUS, CART_STATUS } from '../constants/constant.js';

export const getCart = async (req, res, next) => {
    try {
        let cart;
        if (req.user) {
            cart = await Cart.findOne({ where: { userId: req.user.id, status: CART_STATUS.ACTIVE } });
        } else {
            cart = await Cart.findOne({ where: { sessionId: req.session?.id || 'guest-session', status: CART_STATUS.ACTIVE } });
        }

        if (!cart) {
            cart = await Cart.create({ userId: req.user?.id, status: CART_STATUS.ACTIVE });
        }

        const items = await CartItem.findAll({
            where: { cartId: cart.id },
            include: [
                {
                    model: Product,
                    as: 'product', // Match the alias
                    include: [
                        {
                            model: ProductVariant,
                            as: 'variants', // Match the alias
                            required: false
                        }
                    ]
                }
            ]
        });

        const total = items.reduce((sum, item) => sum + (item.unitPrice || 0) * item.quantity, 0);

        return ApiResponse.success(res, 'Cart retrieved', { cart, items, total });
    } catch (error) {
        next(error);
    }
};

export const addToCart = async (req, res, next) => {
    const { productId, variantId, quantity } = req.body;
    let t;
    try {
        t = await sequelize.transaction();

        if (!variantId) {
            throw new Error('variantId is required');
        }
        if (quantity <= 0) {
            throw new Error('Quantity must be positive');
        }

        let cart = await Cart.findOne({ where: { userId: req.user.id, status: CART_STATUS.ACTIVE } });
        if (!cart) {
            cart = await Cart.create({ userId: req.user.id, status: CART_STATUS.ACTIVE }, { transaction: t });
        }

        const product = await Product.findByPk(productId, { transaction: t });
        if (!product) {
            throw new Error(ERROR_MESSAGES.PRODUCT_NOT_FOUND);
        }

        const productVariant = await ProductVariant.findByPk(variantId, { transaction: t });
        if (!productVariant || productVariant.productId !== productId) {
            throw new Error('Invalid product variant');
        }
        if (productVariant.stockQuantity < quantity) {
            throw new Error('Insufficient stock for variant');
        }

        const unitPrice = productVariant.price || product.price;

        const existingItem = await CartItem.findOne({
            where: { cartId: cart.id, productId, variantId },
            transaction: t
        });

        if (existingItem) {
            existingItem.quantity += quantity;
            await existingItem.update({ quantity: existingItem.quantity, unitPrice }, { transaction: t });
        } else {
            await CartItem.create({
                cartId: cart.id,
                productId,
                variantId,
                quantity,
                unitPrice,
                addedAt: new Date()
            }, { transaction: t });
        }

        await t.commit();
        const cartItems = await getCartItems(cart.id);
        return ApiResponse.success(res, 'Item added to cart', cartItems);
    } catch (error) {
        if (t && !t.finished) {
            await t.rollback();
        }
        next(error);
    }
};

export const updateCart = async (req, res, next) => {
    const { items } = req.body;
    const t = await sequelize.transaction();
    try {
        const cart = await Cart.findOne({ where: { userId: req.user.id, status: CART_STATUS.ACTIVE } });
        if (!cart) throw new Error(ERROR_MESSAGES.CART_NOT_FOUND);

        for (const item of items) {
            const product = await Product.findByPk(item.productId, { transaction: t });
            if (!product) throw new Error(ERROR_MESSAGES.PRODUCT_NOT_FOUND);
            if (product.stockQuantity < item.quantity) throw new Error(ERROR_MESSAGES.PRODUCT_INSUFFICIENT_STOCK);
            const existingItem = await CartItem.findOne({ where: { cartId: cart.id, productId: item.productId, variantId: item.variantId }, transaction: t });
            if (existingItem) {
                await existingItem.update({ quantity: item.quantity }, { transaction: t });
            } else {
                const unitPrice = item.variantId ? (await ProductVariant.findByPk(item.variantId, { transaction: t }))?.price || product.price : product.price;
                await CartItem.create({ cartId: cart.id, ...item, unitPrice }, { transaction: t });
            }
        }
        await t.commit();
        return ApiResponse.success(res, 'Cart updated', await getCartItems(cart.id));
    } catch (error) {
        await t.rollback();
        next(error);
    }
};

export const removeFromCart = async (req, res, next) => {
    const { productId, variantId } = req.body;
    try {
        const cart = await Cart.findOne({ where: { userId: req.user.id, status: CART_STATUS.ACTIVE } });
        if (!cart) throw new Error(ERROR_MESSAGES.CART_NOT_FOUND);

        const item = await CartItem.findOne({ where: { cartId: cart.id, productId, variantId } });
        if (!item) throw new Error(ERROR_MESSAGES.CART_ITEM_NOT_FOUND);

        await item.destroy();
        return ApiResponse.success(res, 'Item removed from cart', await getCartItems(cart.id));
    } catch (error) {
        next(error);
    }
};

export const checkout = async (req, res, next) => {
    const {
        shippingFirstName,
        shippingLastName,
        shippingAddress,
        shippingCity,
        shippingState,
        shippingZip,
        shippingCountry,
        shippingPhone,
        shippingMethod,
        paymentMethod
    } = req.body;
    const t = await sequelize.transaction();
    try {
        const cart = await Cart.findOne({ where: { userId: req.user.id, status: CART_STATUS.ACTIVE } });
        if (!cart) throw new Error(ERROR_MESSAGES.CART_NOT_FOUND);

        const items = await CartItem.findAll({ where: { cartId: cart.id }, transaction: t });
        if (!items.length) throw new Error(ERROR_MESSAGES.CART_EMPTY);

        let subtotal = 0;
        for (const item of items) {
            const product = await Product.findByPk(item.productId, { transaction: t });
            if (product.stockQuantity < item.quantity) throw new Error(ERROR_MESSAGES.PRODUCT_INSUFFICIENT_STOCK);
            subtotal += (item.variantId ? (await ProductVariant.findByPk(item.variantId, { transaction: t }))?.price || product.price : product.price) * item.quantity;
        }

        const tax = 0.0; // Customize
        const shippingCost = shippingMethod === 'free_shipping' ? 0.0 : 10.0;
        const totalAmount = subtotal + tax + shippingCost;

        const order = await Order.create({
            userId: req.user.id,
            orderNumber: null, // Auto-generated
            status: ORDER_STATUS.PENDING,
            totalAmount,
            subtotal,
            tax,
            shippingCost,
            shippingFirstName,
            shippingLastName,
            shippingAddress,
            shippingCity,
            shippingState,
            shippingZip,
            shippingCountry,
            shippingPhone,
            shippingMethod,
            paymentMethod,
            email: (await User.findByPk(req.user.id)).email
        }, { transaction: t });

        const orderItems = await Promise.all(items.map(async item => {
            const product = await Product.findByPk(item.productId, { transaction: t });
            const variant = item.variantId ? await ProductVariant.findByPk(item.variantId, { transaction: t }) : null;
            const unitPrice = variant ? variant.price || product.price : product.price;
            await (variant ? ProductVariant : Product).update(
                { stockQuantity: sequelize.literal(`stockQuantity - ${item.quantity}`) },
                { where: { id: variant?.id || product.id }, transaction: t }
            );
            return {
                orderId: order.id,
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                unitPrice,
                subtotal: unitPrice * item.quantity
            };
        }));

        await OrderOrderItem.bulkCreate(orderItems, { transaction: t });
        await Cart.update({ status: CART_STATUS.CONVERTED }, { where: { id: cart.id }, transaction: t });
        await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });

        await t.commit();
        return ApiResponse.success(res, 'Checkout successful', await Order.findByPk(order.id, { include: [{ model: OrderOrderItem, as: 'items' }] }), HTTP_STATUS_CODES.CREATED);
    } catch (error) {
        await t.rollback();
        next(error);
    }
};

// Helper function to get cart items
async function getCartItems(cartId) {
    try {
        const items = await CartItem.findAll({
            where: { cartId },
            include: [
                {
                    model: Product,
                    as: 'product', // Match the alias defined in CartItem.belongsTo(Product, { as: 'product' })
                    include: [
                        {
                            model: ProductVariant,
                            as: 'variants', // Match the alias defined in Product.hasMany(ProductVariant, { as: 'variants' })
                            required: false // Make ProductVariant optional
                        }
                    ]
                }
            ]
        });
        return items;
    } catch (error) {
        console.error('Error in getCartItems:', error);
        return []; // Return empty array to prevent crashes
    }
}