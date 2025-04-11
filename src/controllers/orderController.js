import sequelize from '../config/database.js';
import { Order, OrderItem, Product, ProductVariant, User } from '../models/index.js';
import ApiResponse from '../utils/ApiResponse.js';
import {
  HTTP_STATUS_CODES,
  ERROR_MESSAGES,
  ORDER_STATUS,
  SHIPPING_METHODS,
} from '../constants/constant.js';

import { calculateFinancialSummary, formatOrderItem } from '../utils/calculateFinancialSummary.js';
import { generateOrderNumber } from '../utils/orderUtils.js';

// Centralized utility function for order number generation
// const generateOrderNumber = () => {
//   const prefix = 'ORD';
//   const timestamp = Date.now().toString().substring(4);
//   const random = Math.floor(Math.random() * 1000)
//     .toString()
//     .padStart(3, '0');
//   return `${prefix}-${timestamp}-${random}`;
// };

// export const placeOrder = async (req, res, next) => {
//   const {
//     items,
//     shippingFirstName,
//     shippingLastName,
//     shippingAddress,
//     shippingCity,
//     shippingZip,
//     shippingPhone,
//     shippingMethod,
//     email,
//     paymentMethod,
//   } = req.body;

//   let t;
//   try {
//     t = await sequelize.transaction();

//     // Calculate totals and validate items
//     let subtotal = 0;
//     for (const item of items) {
//       const product = await Product.findByPk(item.productId, { transaction: t });
//       if (!product) {
//         throw new Error(ERROR_MESSAGES.PRODUCT_NOT_FOUND);
//       }
//       if (item.variantId) {
//         const variant = await ProductVariant.findByPk(item.variantId, { transaction: t });
//         if (!variant || variant.productId !== item.productId) {
//           throw new Error(ERROR_MESSAGES.PRODUCT_VARIANT_NOT_FOUND);
//         }
//         if (variant.stockQuantity < item.quantity) {
//           throw new Error(ERROR_MESSAGES.PRODUCT_INSUFFICIENT_STOCK);
//         }
//         subtotal += (variant.price || product.price) * item.quantity;
//       } else {
//         if (product.stockQuantity < item.quantity) {
//           throw new Error(ERROR_MESSAGES.PRODUCT_INSUFFICIENT_STOCK);
//         }
//         subtotal += product.price * item.quantity;
//       }
//     }

//     // Placeholder for tax and shipping cost
//     const tax = 0.0; // Example: Add tax calculation logic
//     const shippingCost = shippingMethod === SHIPPING_METHODS.FREE_SHIPPING ? 0.0 : 10.0;
//     const discount = 0.0;
//     const totalAmount = subtotal + tax + shippingCost - discount;

//     // Create order with generated order number
//     const order = await Order.create(
//       {
//         userId: req.user.id,
//         orderNumber: generateOrderNumber(),
//         status: ORDER_STATUS.PENDING,
//         totalAmount,
//         subtotal,
//         tax,
//         shippingCost,
//         discount,
//         shippingFirstName,
//         shippingLastName,
//         shippingAddress,
//         shippingCity,
//         shippingZip,
//         shippingPhone,
//         shippingMethod,
//         email: email || (await User.findByPk(req.user.id)).email,
//         paymentMethod,
//       },
//       { transaction: t },
//     );

//     // Create order items and update stock
//     const orderItems = await Promise.all(
//       items.map(async (item) => {
//         const product = await Product.findByPk(item.productId, { transaction: t });
//         const variant = item.variantId
//           ? await ProductVariant.findByPk(item.variantId, { transaction: t })
//           : null;
//         const unitPrice = variant ? variant.price || product.price : product.price;
//         const itemSubtotal = unitPrice * item.quantity;
//         const snapshot = {
//           name: product.name,
//           price: unitPrice,
//           variant: variant ? { size: variant.size, color: variant.color } : null,
//         };

//         if (variant) {
//           await ProductVariant.update(
//             { stockQuantity: variant.stockQuantity - item.quantity },
//             { where: { id: variant.id }, transaction: t },
//           );
//         } else {
//           await Product.update(
//             { stockQuantity: product.stockQuantity - item.quantity },
//             { where: { id: product.id }, transaction: t },
//           );
//         }

//         return {
//           orderId: order.id,
//           productId: item.productId,
//           variantId: item.variantId,
//           quantity: item.quantity,
//           unitPrice,
//           subtotal: itemSubtotal,
//           discount: 0.0,
//           productSnapshot: snapshot,
//         };
//       }),
//     );

//     await OrderItem.bulkCreate(orderItems, { transaction: t });

//     await t.commit();
//     t = null;

//     const createdOrder = await Order.findByPk(order.id, {
//       include: [{ model: OrderItem, as: 'items' }],
//     });

//     return ApiResponse.success(
//       res,
//       'Order placed successfully',
//       createdOrder,
//       HTTP_STATUS_CODES.CREATED,
//     );
//   } catch (error) {
//     // Only roll back if transaction exists and hasn't been committed
//     if (t) await t.rollback();
//     next(error);
//   }
// };

// new placeholder
export const placeOrder = async (req, res, next) => {
  const {
    items,
    firstName,
    lastName,
    phone,
    email,
    deliveryAddress,
    city,
    postCode,
    country,
    paymentMethod,
    shippingMethod,
    taxRate = 0,
  } = req.body;

  let t;
  try {
    t = await sequelize.transaction();

    // Validate items and gather product information
    const productItems = [];
    const productIds = items.map((item) => item.productId);
    const variantIds = items.filter((item) => item.variantId).map((item) => item.variantId);

    // Fetch all products and variants in bulk to optimize DB queries
    const [products, variants] = await Promise.all([
      Product.findAll({ where: { id: productIds }, transaction: t }),
      ProductVariant.findAll({ where: { id: variantIds }, transaction: t }),
    ]);

    const productMap = new Map(products.map((product) => [product.id, product]));
    const variantMap = new Map(variants.map((variant) => [variant.id, variant]));

    // Process each item, validate stock, and prepare for order creation
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(ERROR_MESSAGES.PRODUCT_NOT_FOUND);
      }

      let variant = null;
      if (item.variantId) {
        variant = variantMap.get(item.variantId);
        if (!variant || variant.productId !== item.productId) {
          throw new Error(ERROR_MESSAGES.PRODUCT_VARIANT_NOT_FOUND);
        }
        if (variant.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}`);
        }
      } else {
        if (product.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}`);
        }
      }

      const unitPrice = variant
        ? parseFloat(variant.price || product.price)
        : parseFloat(product.price);

      productItems.push({
        item,
        product,
        variant,
        unitPrice,
      });
    }

    // Calculate financial summary using the shared utility
    const orderItems = productItems.map(({ item, product, variant, unitPrice }) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice,
    }));

    const financialSummary = calculateFinancialSummary(orderItems, {
      shippingMethod,
      taxRate,
      discount: 0,
      applyShipping: true,
    });

    // Create the order
    const orderNumber = generateOrderNumber();
    const order = await Order.create(
      {
        userId: req.user?.id || null,
        orderNumber,
        status: ORDER_STATUS.PENDING,
        totalAmount: financialSummary.totalAmount,
        subtotal: financialSummary.subtotal,
        tax: financialSummary.tax,
        deliveryFee: financialSummary.deliveryFee, // Using consistent field name
        discount: financialSummary.discount,
        firstName,
        lastName,
        deliveryAddress,
        city,
        postCode,
        country,
        phone,
        email:
          email || (req.user ? (await User.findByPk(req.user.id, { transaction: t })).email : null),
        paymentMethod: paymentMethod || PAYMENT_METHODS.PAYPAL,
        paymentStatus: PAYMENT_STATUS.PENDING,
        shippingMethod: shippingMethod || SHIPPING_METHODS.STANDARD,
        processedAt: new Date(),
      },
      { transaction: t },
    );

    // Create order items and update stock
    const formattedOrderItems = productItems.map(({ item, product, variant, unitPrice }) => {
      return {
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        unitPrice,
        subtotal: unitPrice * item.quantity,
        productSnapshot: {
          name: product.name,
          price: unitPrice,
          image:
            product.featuredImage ||
            (product.images && product.images.length > 0 ? product.images[0].url : null),
          variant: variant ? { size: variant.size, color: variant.color } : null,
        },
      };
    });

    await OrderItem.bulkCreate(formattedOrderItems, { transaction: t });

    // Update product stock
    await Promise.all(
      productItems.map(async ({ item, product, variant }) => {
        if (variant) {
          await ProductVariant.update(
            { stockQuantity: sequelize.literal(`"stockQuantity" - ${item.quantity}`) },
            { where: { id: variant.id }, transaction: t },
          );
        }

        // Always update product stock centrally
        await Product.update(
          { stockQuantity: sequelize.literal(`"stockQuantity" - ${item.quantity}`) },
          { where: { id: product.id }, transaction: t },
        );
      }),
    );

    await t.commit();
    t = null;

    // Fetch the complete order with items for response
    const createdOrder = await Order.findByPk(order.id, {
      include: [{ model: OrderItem, as: 'items' }],
    });

    // Include the same financial summary format as in checkout
    return ApiResponse.success(
      res,
      'Order placed successfully',
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        order: createdOrder,
        summary: financialSummary,
      },
      HTTP_STATUS_CODES.CREATED,
    );
  } catch (error) {
    // Only roll back if transaction exists and hasn't been committed
    if (t) await t.rollback();
    next(error);
  }
};

// export const getOrderDetails = async (req, res, next) => {
//   try {
//     const order = await Order.findOne({
//       where: { id: req.params.orderId, userId: req.user.id },
//       include: [{ model: OrderItem, as: 'items' }],
//     });
//     if (!order) {
//       return ApiResponse.error(res, ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
//     }
//     return ApiResponse.success(res, 'Order details retrieved', order);
//   } catch (error) {
//     next(error);
//   }
// };

// new gerOrderDetails
export const getOrderDetails = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.orderId, userId: req.user.id },
      include: [{ model: OrderItem, as: 'items' }],
    });

    if (!order) {
      return ApiResponse.error(res, ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    // Include consistent financial summary
    const financialSummary = {
      subtotal: parseFloat(order.subtotal),
      discount: parseFloat(order.discount || 0),
      deliveryFee: parseFloat(order.deliveryFee || 0),
      tax: parseFloat(order.tax || 0),
      totalAmount: parseFloat(order.totalAmount),
      itemCount: order.items.length,
    };

    return ApiResponse.success(res, 'Order details retrieved', {
      order,
      summary: financialSummary,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderStatus = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.orderId, {
      attributes: ['status', 'trackingNumber', 'trackingUrl', 'shippedAt', 'deliveredAt'],
    });
    if (!order) {
      return ApiResponse.error(res, ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }
    return ApiResponse.success(res, 'Order status retrieved', {
      status: order.status,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req, res, next) => {
  const { cancelReason } = req.body;
  let t;
  try {
    t = await sequelize.transaction();

    const order = await Order.findOne({
      where: { id: req.params.orderId, userId: req.user.id },
      transaction: t,
    });

    if (!order) {
      await t.rollback();
      t = null;
      return ApiResponse.error(res, ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    if ([ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED].includes(order.status)) {
      await t.rollback();
      t = null;
      return ApiResponse.error(
        res,
        ERROR_MESSAGES.ORDER_ALREADY_SHIPPED,
        HTTP_STATUS_CODES.FORBIDDEN,
      );
    }

    if (order.status === ORDER_STATUS.CANCELED) {
      await t.rollback();
      t = null;
      return ApiResponse.error(
        res,
        ERROR_MESSAGES.ORDER_ALREADY_CANCELED,
        HTTP_STATUS_CODES.CONFLICT,
      );
    }

    // Restore stock
    const items = await OrderItem.findAll({
      where: { orderId: order.id },
      transaction: t,
    });

    await Promise.all(
      items.map(async (item) => {
        if (item.variantId) {
          const variant = await ProductVariant.findByPk(item.variantId, { transaction: t });
          await variant.update(
            {
              stockQuantity: variant.stockQuantity + item.quantity,
            },
            { transaction: t },
          );
        } else {
          const product = await Product.findByPk(item.productId, { transaction: t });
          await product.update(
            {
              stockQuantity: product.stockQuantity + item.quantity,
            },
            { transaction: t },
          );
        }
      }),
    );

    await order.update(
      {
        status: ORDER_STATUS.CANCELED,
        cancelledAt: new Date(),
        cancelReason: cancelReason || 'Customer request',
      },
      { transaction: t },
    );

    await t.commit();
    t = null;

    return ApiResponse.success(res, 'Order canceled successfully');
  } catch (error) {
    if (t) await t.rollback();
    next(error);
  }
};

export const getCustomerOrders = async (req, res, next) => {
  try {
    const { limit = 10, offset = 0, status, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;

    // Build the query conditions
    const where = { userId: req.user.id };
    if (status) {
      where.status = status;
    }

    // Fetch orders with pagination, filtering, and sorting
    const orders = await Order.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
      include: [{ model: OrderItem, as: 'items' }],
    });

    if (!orders.rows.length) {
      return ApiResponse.error(res, ERROR_MESSAGES.NO_ORDERS_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    return ApiResponse.success(res, 'Orders retrieved successfully', {
      total: orders.count,
      orders: orders.rows,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    next(error);
  }
};
