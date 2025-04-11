/**
 * Utility functions for consistent financial calculations across the application
 */

/**
 * Calculate order financial summary
 * @param {Array} items - Array of cart or order items with quantity and unit price
 * @param {Object} options - Optional configuration
 * @returns {Object} Financial summary with consistent field names
 */
export const calculateFinancialSummary = (items, options = {}) => {
  const { shippingMethod = null, taxRate = 0, discount = 0, applyShipping = false } = options;

  // Calculate subtotal based on items
  const subtotal = items.reduce((sum, item) => {
    // Handle both cart items and order items
    const unitPrice = parseFloat(item.unitPrice || 0);
    const quantity = item.quantity || 0;
    return sum + unitPrice * quantity;
  }, 0);

  // Apply consistent zero delivery fee as requested
  const deliveryFee = 0;

  // Calculate tax based on subtotal and provided tax rate
  const tax = taxRate > 0 ? subtotal * (taxRate / 100) : 0;

  // Calculate grand total
  const totalAmount = subtotal - discount + deliveryFee + tax;

  // Return consistent financial summary object
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    deliveryFee: parseFloat(deliveryFee.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    itemCount: items.length,
  };
};

/**
 * Format a single cart/order item for consistent representation
 * @param {Object} item - Cart or order item
 * @param {Object} product - Associated product
 * @param {Object} variant - Associated variant (optional)
 * @returns {Object} Formatted item
 */
export const formatOrderItem = (item, product, variant = null) => {
  const unitPrice = variant
    ? parseFloat(variant.price || product.price)
    : parseFloat(product.price);

  return {
    productId: item.productId,
    variantId: item.variantId || null,
    quantity: item.quantity,
    unitPrice: parseFloat(unitPrice.toFixed(2)),
    subtotal: parseFloat((unitPrice * item.quantity).toFixed(2)),
    productSnapshot: {
      name: product.name,
      price: unitPrice,
      image:
        product.featuredImage ||
        (product.images && product.images.length > 0 ? product.images[0].url : null),
      variant: variant ? { size: variant.size, color: variant.color } : null,
    },
  };
};
