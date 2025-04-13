import sequelize from '../config/database.js';
import { Order, OrderItem, Product, ProductVariant, User, ProductImage } from '../models/index.js';
// import transformOrderImages from '../utils/transformOrderImages.js';
import ApiResponse from '../utils/ApiResponse.js';
import {
  HTTP_STATUS_CODES,
  ERROR_MESSAGES,
  ORDER_STATUS,
  SHIPPING_METHODS
} from '../constants/constant.js';

// Helper function to transform order images
const transformOrderImages = (req, order) => {
  if (!order || !order.items) return order;

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const transformedOrder = { ...order.toJSON() };

  transformedOrder.subtotal = parseFloat(transformedOrder.subtotal).toFixed(2);
  transformedOrder.totalAmount = parseFloat(transformedOrder.totalAmount).toFixed(2);
  transformedOrder.tax = parseFloat(transformedOrder.tax).toFixed(2);
  transformedOrder.shippingCost = parseFloat(transformedOrder.shippingCost).toFixed(2);
  transformedOrder.discount = parseFloat(transformedOrder.discount).toFixed(2);

  transformedOrder.items = transformedOrder.items.map((item) => {
    if (item.productSnapshot && item.productSnapshot.imageId) {
      item.productSnapshot.imageUrl = `${baseUrl}/api/products/images/${item.productSnapshot.imageId}`;
      item.productSnapshot.price = parseFloat(item.productSnapshot.price).toFixed(2);
    }
    if (item.productImage) {
      item.imageUrl = `${baseUrl}/api/products/images/${item.productImage.id}`;
      delete item.productImage.imageData;
    }
    item.unitPrice = parseFloat(item.unitPrice).toFixed(2);
    item.subtotal = parseFloat(item.subtotal).toFixed(2);
    return item;
  });

  return transformedOrder;
};

// Centralized utility function for order number generation
const generateOrderNumber = () => {
  const prefix = 'ORD';
  const timestamp = Date.now().toString().substring(4);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
};
export const placeOrder = async (req, res, next) => {
  const {
    items,
    shippingFirstName,
    shippingLastName,
    shippingAddress,
    shippingCity,
    shippingZip,
    shippingPhone,
    shippingMethod,
    email,
    paymentMethod,
  } = req.body;

  let t;
  try {
    t = await sequelize.transaction();

    // Validate and calculate order items
    let subtotal = 0;
    const orderItems = await Promise.all(
      items.map(async (item) => {
        // Fetch product with default image
        const product = await Product.findByPk(item.productId, {
          transaction: t,
          include: [
            {
              model: ProductImage,
              as: 'images',
              where: { isDefault: true },
              required: false,
              limit: 1,
            },
          ],
        });
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        // Validate stock using Product.stockQuantity
        if (product.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name} (available: ${product.stockQuantity})`);
        }

        // Determine unit price
        let unitPrice;
        let variant = null;
        if (item.variantId) {
          variant = await ProductVariant.findByPk(item.variantId, { transaction: t });
          if (!variant || variant.productId !== item.productId) {
            throw new Error(`Invalid variant ${item.variantId} for product ${item.productId}`);
          }
          unitPrice = variant.price !== null ? parseFloat(variant.price) : parseFloat(product.price);
        } else {
          unitPrice = parseFloat(product.price);
        }

        if (isNaN(unitPrice) || unitPrice <= 0) {
          throw new Error(`Invalid price for product ${product.name}: ${unitPrice}`);
        }

        // Calculate item subtotal with precision
        const itemSubtotal = parseFloat((unitPrice * item.quantity).toFixed(2));
        subtotal += itemSubtotal;

        // Build product snapshot
        const defaultImage = product.images && product.images.length > 0 ? product.images[0] : null;
        const snapshot = {
          name: product.name,
          price: unitPrice.toFixed(2),
          variant: variant ? { size: variant.size, color: variant.color, material: variant.material } : null,
          imageId: defaultImage ? defaultImage.id : null,
        };

        return {
          orderId: null, // Set later
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: item.quantity,
          unitPrice: unitPrice.toFixed(2),
          subtotal: itemSubtotal,
          discount: 0.0,
          productSnapshot: snapshot,
        };
      })
    );

    // Calculate financials
    const tax = 0.0; // Add tax logic if needed
    const shippingCost = shippingMethod === SHIPPING_METHODS.FREE_SHIPPING ? 0.0 : 10.0;
    const discount = 0.0;
    const totalAmount = parseFloat((subtotal + tax + shippingCost - discount).toFixed(2));

    // Create order
    const order = await Order.create(
      {
        userId: req.user.id,
        orderNumber: generateOrderNumber(),
        status: ORDER_STATUS.PENDING,
        totalAmount: totalAmount.toFixed(2),
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        discount: discount.toFixed(2),
        shippingFirstName,
        shippingLastName,
        shippingAddress,
        shippingCity,
        shippingZip,
        shippingPhone,
        shippingMethod,
        email: email || (await User.findByPk(req.user.id, { transaction: t })).email,
        paymentMethod,
      },
      { transaction: t }
    );

    // Assign orderId to items
    orderItems.forEach((item) => {
      item.orderId = order.id;
    });

    // Create order items
    await OrderItem.bulkCreate(orderItems, { transaction: t });

    // Update Product stock
    await Promise.all(
      items.map(async (item) => {
        await Product.update(
          { stockQuantity: sequelize.literal(`"stockQuantity" - ${item.quantity}`) },
          { where: { id: item.productId }, transaction: t }
        );
      })
    );

    await t.commit();

    // Fetch created order
    const createdOrder = await Order.findByPk(order.id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: ProductImage,
              as: 'productImage',
              attributes: ['id', 'isDefault', 'mimeType'],
              where: { isDefault: true },
              required: false,
            },
          ],
        },
      ],
    });

    const transformedOrder = transformOrderImages(req, createdOrder);

    return ApiResponse.success(
      res,
      'Order placed successfully',
      transformedOrder,
      HTTP_STATUS_CODES.CREATED
    );
  } catch (error) {
    if (t) await t.rollback();
    console.error('Error in placeOrder:', error.message, error.stack);
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

// Updated getOrderDetails to include product images
// export const getOrderDetails = async (req, res, next) => {
//   try {
//     const order = await Order.findOne({
//       where: { id: req.params.orderId, userId: req.user.id },
//       include: [
//         {
//           model: OrderItem,
//           as: 'items',
//           include: [
//             {
//               model: ProductImage,
//               as: 'productImage',
//               attributes: ['id', 'isDefault', 'mimeType'],
//               where: { isDefault: true },
//               required: false,
//               limit: 1,
//             },
//           ],
//         },
//       ],
//     });

//     if (!order) {
//       return ApiResponse.error(res, ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
//     }

//     // Transform the order to include image URLs
//     const transformedOrder = transformOrderImages(req, order);

//     return ApiResponse.success(res, 'Order details retrieved', transformedOrder);
//   } catch (error) {
//     next(error);
//   }
// };

// Updated getOrderDetails to include product images
export const getOrderDetails = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.orderId, userId: req.user.id },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: ProductImage,
              as: 'productImage',
              attributes: ['id', 'isDefault', 'mimeType'],
              where: { isDefault: true },
              required: false,
              // Remove the limit parameter since it's not supported for belongsTo
            },
          ],
        },
      ],
    });

    if (!order) {
      return ApiResponse.error(res, ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    // Transform the order to include image URLs
    const transformedOrder = transformOrderImages(req, order);

    return ApiResponse.success(res, 'Order details retrieved', transformedOrder);
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
      return ApiResponse.error(res, ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    if ([ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED].includes(order.status)) {
      await t.rollback();
      return ApiResponse.error(
        res,
        ERROR_MESSAGES.ORDER_ALREADY_SHIPPED,
        HTTP_STATUS_CODES.FORBIDDEN
      );
    }

    if (order.status === ORDER_STATUS.CANCELED) {
      await t.rollback();
      return ApiResponse.error(
        res,
        ERROR_MESSAGES.ORDER_ALREADY_CANCELED,
        HTTP_STATUS_CODES.CONFLICT
      );
    }

    // Restore stock to Product only
    const items = await OrderItem.findAll({
      where: { orderId: order.id },
      transaction: t,
    });

    await Promise.all(
      items.map(async (item) => {
        await Product.update(
          { stockQuantity: sequelize.literal(`"stockQuantity" + ${item.quantity}`) },
          { where: { id: item.productId }, transaction: t }
        );
      })
    );

    await order.update(
      {
        status: ORDER_STATUS.CANCELED,
        cancelledAt: new Date(),
        cancelReason: cancelReason || 'Customer request',
      },
      { transaction: t }
    );

    await t.commit();
    return ApiResponse.success(res, 'Order canceled successfully');
  } catch (error) {
    if (t) await t.rollback();
    console.error('Error in cancelOrder:', error.message, error.stack);
    next(error);
  }
};

// Updated getCustomerOrders to include product images
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
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: ProductImage,
              as: 'productImage',
              attributes: ['id', 'isDefault', 'mimeType'],
              where: { isDefault: true },
              required: false,
            },
          ],
        },
      ],
    });

    if (!orders.rows.length) {
      return ApiResponse.error(res, ERROR_MESSAGES.NO_ORDERS_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    // Transform each order to include image URLs
    const transformedOrders = orders.rows.map((order) => transformOrderImages(req, order));

    return ApiResponse.success(res, 'Orders retrieved successfully', {
      total: orders.count,
      orders: transformedOrders,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    next(error);
  }
};
