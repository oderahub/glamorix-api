// Helper function to transform product data for API responses
export const transformProductData = (product, baseUrl = '') => {
  if (!product) return null;

  const productJSON = product.toJSON ? product.toJSON() : { ...product };

  // Transform images to include URLs
  if (productJSON.images && productJSON.images.length > 0) {
    productJSON.images = productJSON.images.map((image) => ({
      ...image,
      imageUrl: `${baseUrl}/api/products/images/${image.id}`,
      // Remove the large base64 string if it exists in the response
      imageData: undefined,
    }));
  }

  // Remove the base64 featuredImage from response and use first image URL instead
  if (productJSON.images && productJSON.images.length > 0) {
    productJSON.featuredImageUrl =
      productJSON.images.find((img) => img.isDefault)?.imageUrl || productJSON.images[0].imageUrl;
  }
  delete productJSON.featuredImage;

  return productJSON;
};
