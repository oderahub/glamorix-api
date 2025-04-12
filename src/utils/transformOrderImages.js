// Helper function to transform image URLs in order responses
const transformOrderImages = (req, order) => {
  if (!order || !order.items) return order;

  const baseUrl = `${req.protocol}://${req.get('host')}`;

  // Process items array
  const transformedOrder = { ...order.toJSON() };

  transformedOrder.items = transformedOrder.items.map((item) => {
    // Add image URL to the product snapshot if imageId is available
    if (item.productSnapshot && item.productImage) {
      item.productSnapshot.imageUrl = `${baseUrl}/api/products/images/${item.productImage.id}`;
    }

    // Clean up by removing base64 data if present
    if (item.productImage) {
      delete item.productImage.imageData;
    }

    return item;
  });

  return transformedOrder;
};

export default transformOrderImages;
