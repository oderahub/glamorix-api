/**
 * Utility functions for handling orders
 */

/**
 * Generate a consistent order number across the application
 * @returns {string} Formatted order number
 */
export const generateOrderNumber = () => {
  const prefix = 'ORD';
  const timestamp = Date.now().toString().substring(4);
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Format order data for consistent API responses
 * @param {Object} order - Order object from database
 * @param {Array} items - Order items
 * @returns {Object} Formatted order data
 */
export const formatOrderResponse = (order, items = []) => {
  // Calculate financial summary from order data
  const financialSummary = {
    subtotal: parseFloat(order.subtotal || 0),
    discount: parseFloat(order.discount || 0),
    deliveryFee: parseFloat(order.deliveryFee || 0),
    tax: parseFloat(order.tax || 0),
    totalAmount: parseFloat(order.totalAmount || 0),
    itemCount: items.length || 0,
  };

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    createdAt: order.createdAt,
    items: items,
    customer: {
      firstName: order.firstName,
      lastName: order.lastName,
      email: order.email,
      phone: order.phone,
    },
    shipping: {
      address: order.deliveryAddress,
      city: order.city,
      postCode: order.postCode,
      country: order.country,
      method: order.shippingMethod,
    },
    payment: {
      method: order.paymentMethod,
      status: order.paymentStatus,
    },
    summary: financialSummary,
  };
};
