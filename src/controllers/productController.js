// import {
//   Product,
//   ProductCategory,
//   Category,
//   ProductVariant,
//   ProductImage,
// } from '../models/index.js';
// import ApiResponse from '../utils/ApiResponse.js';
// import { HTTP_STATUS_CODES, ERROR_MESSAGES, PRODUCT_STATUS } from '../constants/constant.js';
// import slugify from 'slugify';
// import sequelize from '../config/database.js';
// import { v4 as uuidv4 } from 'uuid';
// import { Op } from 'sequelize';

// // Helper function to transform product data for API responses
// const transformProductData = (product, baseUrl = '') => {
//   if (!product) return null;

//   const productJSON = product.toJSON ? product.toJSON() : { ...product };

//   // Transform images to include URLs
//   if (productJSON.images && productJSON.images.length > 0) {
//     productJSON.images = productJSON.images.map((image) => ({
//       ...image,
//       imageUrl: `${baseUrl}/api/products/images/${image.id}`,
//       // Remove the large base64 string if it exists in the response
//       imageData: undefined,
//     }));
//   }

//   // Remove the base64 featuredImage from response and use first image URL instead
//   if (productJSON.images && productJSON.images.length > 0) {
//     productJSON.featuredImageUrl =
//       productJSON.images.find((img) => img.isDefault)?.imageUrl || productJSON.images[0].imageUrl;
//   }
//   delete productJSON.featuredImage;

//   return productJSON;
// };

// export const addProductImages = async (req, res, next) => {
//   const t = await sequelize.transaction();
//   try {
//     const { productId } = req.params;
//     const product = await Product.findByPk(productId, { paranoid: false });

//     if (!product) {
//       return ApiResponse.error(res, 'Product not found', 404);
//     }

//     if (!req.files || req.files.length === 0) {
//       return ApiResponse.error(res, 'No images uploaded', 400);
//     }

//     // Validate file size (e.g., max 5MB)
//     const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
//     const imageData = req.files.map((file, index) => {
//       if (file.size > MAX_FILE_SIZE) {
//         throw new Error(`File ${file.originalname} exceeds maximum size of 5MB`);
//       }

//       return {
//         id: uuidv4(),
//         productId: product.id,
//         imageData: file.buffer.toString('base64'),
//         mimeType: file.mimetype,
//         displayOrder: index,
//         isDefault: index === 0,
//       };
//     });

//     await ProductImage.bulkCreate(imageData, {
//       transaction: t,
//       validate: true,
//     });
//     await t.commit();

//     const images = await ProductImage.findAll({
//       where: { productId: product.id },
//       attributes: ['id', 'displayOrder', 'isDefault', 'createdAt', 'mimeType'],
//     });

//     // Transform the response to include image URLs
//     const baseUrl = `${req.protocol}://${req.get('host')}`;
//     const transformedImages = images.map((image) => ({
//       ...image.toJSON(),
//       imageUrl: `${baseUrl}/products/images/${image.id}`,
//     }));

//     return ApiResponse.success(res, 'Product images added successfully', transformedImages);
//   } catch (error) {
//     await t.rollback();
//     next(error);
//   }
// };

// export const createProduct = async (req, res, next) => {
//   const t = await sequelize.transaction();
//   try {
//     const {
//       name,
//       description,
//       price,
//       discountPercentage,
//       stockQuantity,
//       sku,
//       isActive,
//       categoryIds = [],
//       variants = [],
//     } = req.body;

//     const slug = slugify(name, { lower: true, strict: true });

//     // Normalize isActive value
//     let normalizedStatus = PRODUCT_STATUS.ACTIVE; // Default to ACTIVE

//     if (isActive) {
//       const validStatuses = Object.values(PRODUCT_STATUS);
//       const normalizedInput = isActive.toLowerCase();

//       // Find exact match first
//       if (validStatuses.includes(isActive)) {
//         normalizedStatus = isActive;
//       }
//       // Then try case-insensitive match
//       else {
//         const matchedStatus = validStatuses.find(s => s.toLowerCase() === normalizedInput);
//         if (matchedStatus) {
//           normalizedStatus = matchedStatus;
//         }
//       }
//     }

//     // Create product with normalized status
//     const product = await Product.create(
//       {
//         name,
//         slug,
//         description,
//         price,
//         discountPercentage,
//         stockQuantity: stockQuantity || 0,
//         sku,
//         isActive: normalizedStatus,
//         featuredImage:
//           req.files && req.files.length > 0 ? req.files[0].buffer.toString('base64') : null,
//       },
//       { transaction: t }
//     );

//     // Handle multiple images
//     if (req.files && req.files.length > 0) {
//       const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
//       const imageData = req.files.map((file, index) => {
//         if (file.size > MAX_FILE_SIZE) {
//           throw new Error(`File ${file.originalname} exceeds maximum size of 5MB`);
//         }

//         return {
//           id: uuidv4(),
//           productId: product.id,
//           imageData: file.buffer.toString('base64'),
//           mimeType: file.mimetype,
//           displayOrder: index,
//           isDefault: index === 0,
//         };
//       });
//       await ProductImage.bulkCreate(imageData, {
//         transaction: t,
//         validate: true,
//       });
//     }

//     if (categoryIds.length > 0) {
//       const productCategories = categoryIds.map((categoryId) => ({
//         productId: product.id,
//         categoryId,
//         isPrimary: categoryId === categoryIds[0],
//       }));
//       await ProductCategory.bulkCreate(productCategories, { transaction: t });
//     }

//     if (variants.length > 0) {
//       const variantData = variants.map((variant, index) => ({
//         id: uuidv4(),
//         productId: product.id,
//         size: variant.size || 'N/A',
//         color: variant.color || 'N/A',
//         material: variant.material || 'N/A',
//         price: variant.price || price,
//         stockQuantity: variant.stockQuantity || 0,
//         sku: `${slug}-${index + 1}`,
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       }));
//       await ProductVariant.bulkCreate(variantData, { transaction: t });
//     }

//     await t.commit();

//     const result = await Product.findByPk(product.id, {
//       include: [
//         { model: Category, as: 'categories', through: { attributes: [] } },
//         { model: ProductVariant, as: 'variants' },
//         {
//           model: ProductImage,
//           as: 'images',
//           attributes: ['id', 'displayOrder', 'isDefault', 'mimeType'],
//         },
//       ],
//     });

//     // Transform result to include image URLs
//     const baseUrl = `${req.protocol}://${req.get('host')}`;
//     const transformedResult = transformProductData(result, baseUrl);

//     return ApiResponse.success(res, 'Product created successfully', transformedResult, 201);
//   } catch (error) {
//     await t.rollback();
//     next(error);
//   }
// };

// export const updateProduct = async (req, res, next) => {
//   const t = await sequelize.transaction();
//   try {
//     const product = await Product.findByPk(req.params.id, { paranoid: false });
//     if (!product) {
//       return ApiResponse.error(res, ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
//     }

//     const updatedData = { ...req.body };
//     if (req.file) {
//       updatedData.featuredImage = req.file.buffer.toString('base64');
//     }
//     if (updatedData.name) {
//       updatedData.slug = slugify(updatedData.name, { lower: true, strict: true });
//     }
//     await product.update(updatedData, { transaction: t });

//     if (req.body.categoryIds) {
//       await ProductCategory.destroy({ where: { productId: product.id }, transaction: t });
//       const productCategories = req.body.categoryIds.map((categoryId) => ({
//         productId: product.id,
//         categoryId,
//         isPrimary: categoryId === req.body.categoryIds[0],
//       }));
//       await ProductCategory.bulkCreate(productCategories, { transaction: t });
//     }

//     if (req.body.variants) {
//       await ProductVariant.destroy({ where: { productId: product.id }, transaction: t });
//       const variantData = req.body.variants.map((variant, index) => ({
//         id: uuidv4(), // Generate UUID
//         productId: product.id,
//         size: variant.size || 'N/A',
//         color: variant.color || 'N/A',
//         material: variant.material || 'N/A',
//         price: variant.price || product.price,
//         stockQuantity: variant.stockQuantity || 0,
//         sku: `${product.slug}-${index + 1}`,
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       }));
//       await ProductVariant.bulkCreate(variantData, { transaction: t });
//     }

//     await t.commit();

//     const result = await Product.findByPk(product.id, {
//       include: [
//         { model: Category, as: 'categories', through: { attributes: [] } },
//         { model: ProductVariant, as: 'variants' },
//         {
//           model: ProductImage,
//           as: 'images',
//           attributes: ['id', 'displayOrder', 'isDefault', 'mimeType'],
//         },
//       ],
//     });

//     // Transform result to include image URLs
//     const baseUrl = `${req.protocol}://${req.get('host')}`;
//     const transformedResult = transformProductData(result, baseUrl);

//     return ApiResponse.success(res, 'Product updated successfully', transformedResult);
//   } catch (error) {
//     await t.rollback();
//     next(error);
//   }
// };

// export const deleteProduct = async (req, res, next) => {
//   try {
//     const product = await Product.findByPk(req.params.id, { paranoid: false });
//     if (!product) {
//       return ApiResponse.error(res, ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
//     }
//     await product.destroy({ force: true });
//     return ApiResponse.success(res, 'Product deleted', null, HTTP_STATUS_CODES.NO_CONTENT);
//   } catch (error) {
//     next(error);
//   }
// };

// export const updateStock = async (req, res, next) => {
//   const t = await sequelize.transaction();
//   try {
//     const { variantId } = req.query;
//     if (!variantId) {
//       return ApiResponse.error(res, 'variantId is required', HTTP_STATUS_CODES.BAD_REQUEST);
//     }
//     const product = await Product.findByPk(req.params.id, { paranoid: false });
//     if (!product) {
//       return ApiResponse.error(res, ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
//     }
//     const productVariant = await ProductVariant.findOne({
//       where: { id: variantId, productId: product.id },
//       transaction: t,
//     });
//     if (!productVariant) {
//       return ApiResponse.error(res, 'Product variant not found', HTTP_STATUS_CODES.NOT_FOUND);
//     }
//     const { stockQuantity } = req.body;
//     await productVariant.update({ stockQuantity }, { transaction: t });
//     await t.commit();
//     return ApiResponse.success(res, 'Stock updated successfully', productVariant);
//   } catch (error) {
//     await t.rollback();
//     next(error);
//   }
// };

// export const archiveProduct = async (req, res, next) => {
//   try {
//     const product = await Product.findByPk(req.params.id, { paranoid: false });
//     if (!product) {
//       return ApiResponse.error(res, ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
//     }
//     await product.update({ isActive: PRODUCT_STATUS.ARCHIEVED });
//     return ApiResponse.success(res, 'Product archived successfully', product);
//   } catch (error) {
//     next(error);
//   }
// };

// export const restoreProduct = async (req, res, next) => {
//   try {
//     const product = await Product.findByPk(req.params.id, { paranoid: false });
//     if (!product) {
//       return ApiResponse.error(res, ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
//     }
//     await product.restore();
//     return ApiResponse.success(res, 'Product restored successfully', product);
//   } catch (error) {
//     next(error);
//   }
// };

// export const getProductImage = async (req, res, next) => {
//   try {
//     const { imageId } = req.params;
//     const image = await ProductImage.findByPk(imageId);

//     if (!image) {
//       return ApiResponse.error(res, 'Image not found', 404);
//     }

//     const imageBuffer = Buffer.from(image.imageData, 'base64');
//     res.set('Content-Type', image.mimeType);
//     res.set('Cache-Control', 'public, max-age=31557600'); // Cache for 1 year
//     return res.send(imageBuffer);
//   } catch (error) {
//     next(error);
//   }
// };

// // New function to get all products with proper image URLs
// export const getAllProducts = async (req, res, next) => {
//   try {
//     const {
//       limit = 10,
//       offset = 0,
//       categoriesId,
//       isActive = PRODUCT_STATUS.ACTIVE,
//       minPrice,
//       maxPrice,
//       sort = 'createdAt_desc',
//     } = req.query;
//     const where = {};

//     // Add isActive filter
//     if (isActive) {
//       where.isActive = isActive;
//     }

//     if (minPrice || maxPrice) {
//       where.price = {};
//       if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
//       if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
//     }

//     let order = [['createdAt', 'DESC']];
//     if (sort === 'price_asc') order = [['price', 'ASC']];
//     if (sort === 'price_desc') order = [['price', 'DESC']];

//     const products = await Product.findAll({
//       where,
//       include: [
//         { model: Category, as: 'categories', through: { attributes: [] } },
//         { model: ProductVariant, as: 'variants' },
//         {
//           model: ProductImage,
//           as: 'images',
//           attributes: ['id', 'displayOrder', 'isDefault', 'mimeType'], // Exclude imageData
//           order: [['displayOrder', 'ASC']],
//         },
//       ],
//       limit: parseInt(limit),
//       offset: parseInt(offset),
//       order,
//       paranoid: false,
//     });

//     const total = await Product.count({ where });

//     // Transform products to include image URLs
//     const baseUrl = `${req.protocol}://${req.get('host')}`;
//     const transformedProducts = products.map((product) => transformProductData(product, baseUrl));

//     return ApiResponse.success(res, 'Products retrieved', {
//       products: transformedProducts,
//       pagination: { limit, offset, total },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // Get product by ID with proper image URLs
// export const getProductById = async (req, res, next) => {
//   try {
//     const product = await Product.findByPk(req.params.id, {
//       include: [
//         { model: Category, as: 'categories', through: { attributes: [] } },
//         { model: ProductVariant, as: 'variants' },
//         {
//           model: ProductImage,
//           as: 'images',
//           attributes: ['id', 'displayOrder', 'isDefault', 'mimeType'],
//           order: [['displayOrder', 'ASC']],
//         },
//       ],
//       paranoid: false,
//     });

//     if (!product) {
//       return ApiResponse.error(res, ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
//     }

//     // Transform product to include image URLs
//     const baseUrl = `${req.protocol}://${req.get('host')}`;
//     const transformedProduct = transformProductData(product, baseUrl);

//     return ApiResponse.success(res, 'Product details', transformedProduct);
//   } catch (error) {
//     next(error);
//   }
// };

// // Get products by category with proper image URLs
// export const getProductsByCategory = async (req, res, next) => {
//   try {
//     const { limit = 10, offset = 0, isActive = true, sort = 'createdAt_desc' } = req.query;
//     let order = [['createdAt', 'DESC']];
//     if (sort === 'price_asc') order = [['price', 'ASC']];
//     if (sort === 'price_desc') order = [['price', 'DESC']];

//     const products = await Product.findAll({
//       include: [
//         {
//           model: Category,
//           as: 'categories',
//           where: { id: req.params.id, ...(isActive ? { isActive } : {}) },
//           through: { attributes: [] },
//           paranoid: false,
//         },
//         { model: ProductVariant, as: 'variants' },
//         {
//           model: ProductImage,
//           as: 'images',
//           attributes: ['id', 'displayOrder', 'isDefault', 'mimeType'],
//           order: [['displayOrder', 'ASC']],
//         },
//       ],
//       limit: parseInt(limit),
//       offset: parseInt(offset),
//       order,
//     });

//     const total = await Product.count({
//       include: [
//         {
//           model: Category,
//           as: 'categories',
//           where: { id: req.params.id, ...(isActive ? { isActive } : {}) },
//           paranoid: false,
//         },
//       ],
//     });

//     // Transform products to include image URLs
//     const baseUrl = `${req.protocol}://${req.get('host')}`;
//     const transformedProducts = products.map((product) => transformProductData(product, baseUrl));

//     return ApiResponse.success(res, 'Products by category', {
//       products: transformedProducts,
//       pagination: { limit, offset, total },
//     });
//   } catch (error) {
//     next(error);
//   }
// };



import {
  Product,
  ProductCategory,
  Category,
  ProductVariant,
  ProductImage,
} from '../models/index.js';
import ApiResponse from '../utils/ApiResponse.js';
import { HTTP_STATUS_CODES, ERROR_MESSAGES, PRODUCT_STATUS } from '../constants/constant.js';
import slugify from 'slugify';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';

// Helper function to transform product data for API responses
const transformProductData = (product, baseUrl = '') => {
  if (!product) return null;

  const productJSON = product.toJSON ? product.toJSON() : { ...product };

  // Transform images to include URLs
  if (productJSON.images && productJSON.images.length > 0) {
    productJSON.images = productJSON.images.map((image) => ({
      ...image,
      imageUrl: `${baseUrl}/api/products/images/${image.id}`,
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

export const addProductImages = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { productId } = req.params;
    const product = await Product.findByPk(productId, { paranoid: false });

    if (!product) {
      return ApiResponse.error(res, 'Product not found', 404);
    }

    if (!req.files || req.files.length === 0) {
      return ApiResponse.error(res, 'No images uploaded', 400);
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const imageData = req.files.map((file, index) => {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File ${file.originalname} exceeds maximum size of 5MB`);
      }

      return {
        id: uuidv4(),
        productId: product.id,
        imageData: file.buffer.toString('base64'),
        mimeType: file.mimetype,
        displayOrder: index,
        isDefault: index === 0,
      };
    });

    await ProductImage.bulkCreate(imageData, { transaction: t, validate: true });
    await t.commit();

    const images = await ProductImage.findAll({
      where: { productId: product.id },
      attributes: ['id', 'displayOrder', 'isDefault', 'createdAt', 'mimeType'],
    });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const transformedImages = images.map((image) => ({
      ...image.toJSON(),
      imageUrl: `${baseUrl}/products/images/${image.id}`,
    }));

    return ApiResponse.success(res, 'Product images added successfully', transformedImages);
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// export const createProduct = async (req, res, next) => {
//   const t = await sequelize.transaction();
//   try {
//     const {
//       name,
//       description,
//       price,
//       discountPercentage,
//       stockQuantity,
//       sku,
//       isActive,
//       categoryIds = [],
//       variants = [],
//     } = req.body;

//     const slug = slugify(name, { lower: true, strict: true });

//     // Create product
//     const product = await Product.create(
//       {
//         name,
//         slug,
//         description,
//         price,
//         discountPercentage,
//         stockQuantity: stockQuantity || 0,
//         sku,
//         isActive: PRODUCT_STATUS.ACTIVE,
//         featuredImage:
//           req.files && req.files.length > 0 ? req.files[0].buffer.toString('base64') : null,
//       },
//       { transaction: t },
//     );

//     // Handle multiple images
//     if (req.files && req.files.length > 0) {
//       const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
//       const imageData = req.files.map((file, index) => {
//         if (file.size > MAX_FILE_SIZE) {
//           throw new Error(`File ${file.originalname} exceeds maximum size of 5MB`);
//         }

//         return {
//           id: uuidv4(),
//           productId: product.id,
//           imageData: file.buffer.toString('base64'),
//           mimeType: file.mimetype,
//           displayOrder: index,
//           isDefault: index === 0,
//         };
//       });
//       await ProductImage.bulkCreate(imageData, {
//         transaction: t,
//         validate: true,
//       });
//     }

//     if (categoryIds.length > 0) {
//       const productCategories = categoryIds.map((categoryId) => ({
//         productId: product.id,
//         categoryId,
//         isPrimary: categoryId === categoryIds[0],
//       }));
//       await ProductCategory.bulkCreate(productCategories, { transaction: t });
//     }

//     if (variants.length > 0) {
//       const variantData = variants.map((variant, index) => ({
//         id: uuidv4(),
//         productId: product.id,
//         size: variant.size || 'N/A',
//         color: variant.color || 'N/A',
//         material: variant.material || 'N/A',
//         price: variant.price || price,
//         stockQuantity: variant.stockQuantity || 0,
//         sku: `${slug}-${index + 1}`,
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       }));
//       await ProductVariant.bulkCreate(variantData, { transaction: t });
//     }

//     await t.commit();

//     const result = await Product.findByPk(product.id, {
//       include: [
//         { model: Category, as: 'categories', through: { attributes: [] } },
//         { model: ProductVariant, as: 'variants' },
//         {
//           model: ProductImage,
//           as: 'images',
//           attributes: ['id', 'displayOrder', 'isDefault', 'mimeType'],
//         },
//       ],
//     });

//     // Transform result to include image URLs
//     const baseUrl = `${req.protocol}://${req.get('host')}`;
//     const transformedResult = transformProductData(result, baseUrl);

//     return ApiResponse.success(res, 'Product created successfully', transformedResult, 201);
//   } catch (error) {
//     await t.rollback();
//     next(error);
//   }
// };

// export const updateProduct = async (req, res, next) => {
//   const t = await sequelize.transaction();
//   try {
//     const product = await Product.findByPk(req.params.id, { paranoid: false });
//     if (!product) {
//       return ApiResponse.error(res, ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
//     }

//     const updatedData = { ...req.body };
//     if (req.file) {
//       updatedData.featuredImage = req.file.buffer.toString('base64');
//     }
//     if (updatedData.name) {
//       updatedData.slug = slugify(updatedData.name, { lower: true, strict: true });
//     }
//     await product.update(updatedData, { transaction: t });

//     if (req.body.categoryIds) {
//       await ProductCategory.destroy({ where: { productId: product.id }, transaction: t });
//       const productCategories = req.body.categoryIds.map((categoryId) => ({
//         productId: product.id,
//         categoryId,
//         isPrimary: categoryId === req.body.categoryIds[0],
//       }));
//       await ProductCategory.bulkCreate(productCategories, { transaction: t });
//     }

//     if (req.body.variants) {
//       await ProductVariant.destroy({ where: { productId: product.id }, transaction: t });
//       const variantData = req.body.variants.map((variant, index) => ({
//         id: uuidv4(), // Generate UUID
//         productId: product.id,
//         size: variant.size || 'N/A',
//         color: variant.color || 'N/A',
//         material: variant.material || 'N/A',
//         price: variant.price || product.price,
//         stockQuantity: variant.stockQuantity || 0,
//         sku: `${product.slug}-${index + 1}`,
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       }));
//       await ProductVariant.bulkCreate(variantData, { transaction: t });
//     }

//     await t.commit();

//     const result = await Product.findByPk(product.id, {
//       include: [
//         { model: Category, as: 'categories', through: { attributes: [] } },
//         { model: ProductVariant, as: 'variants' },
//         {
//           model: ProductImage,
//           as: 'images',
//           attributes: ['id', 'displayOrder', 'isDefault', 'mimeType'],
//         },
//       ],
//     });

//     // Transform result to include image URLs
//     const baseUrl = `${req.protocol}://${req.get('host')}`;
//     const transformedResult = transformProductData(result, baseUrl);

//     return ApiResponse.success(res, 'Product updated successfully', transformedResult);
//   } catch (error) {
//     await t.rollback();
//     next(error);
//   }
// };

// UPDATED PRODUCT AND STOCK VARIANT QUANTITY HANDLING

export const createProduct = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      name,
      description,
      price,
      discountPercentage,
      stockQuantity,
      sku,
      isActive,
      categoryIds = [],
      variants = [],
    } = req.body;

    const slug = slugify(name, { lower: true, strict: true });
    let normalizedStatus = PRODUCT_STATUS.ACTIVE;

    if (isActive) {
      const validStatuses = Object.values(PRODUCT_STATUS);
      const normalizedInput = isActive.toLowerCase();
      if (validStatuses.includes(isActive)) {
        normalizedStatus = isActive;
      } else {
        const matchedStatus = validStatuses.find(s => s.toLowerCase() === normalizedInput);
        if (matchedStatus) normalizedStatus = matchedStatus;
      }
    }

    const product = await Product.create(
      {
        name,
        slug,
        description,
        price,
        discountPercentage,
        stockQuantity: stockQuantity || 0, // Centralized stock
        sku,
        isActive: normalizedStatus,
        featuredImage: req.files && req.files.length > 0 ? req.files[0].buffer.toString('base64') : null,
      },
      { transaction: t }
    );

    if (req.files && req.files.length > 0) {
      const MAX_FILE_SIZE = 5 * 1024 * 1024;
      const imageData = req.files.map((file, index) => {
        if (file.size > MAX_FILE_SIZE) throw new Error(`File ${file.originalname} exceeds maximum size of 5MB`);
        return {
          id: uuidv4(),
          productId: product.id,
          imageData: file.buffer.toString('base64'),
          mimeType: file.mimetype,
          displayOrder: index,
          isDefault: index === 0,
        };
      });
      await ProductImage.bulkCreate(imageData, { transaction: t, validate: true });
    }

    if (categoryIds.length > 0) {
      const productCategories = categoryIds.map((categoryId) => ({
        productId: product.id,
        categoryId,
        isPrimary: categoryId === categoryIds[0],
      }));
      await ProductCategory.bulkCreate(productCategories, { transaction: t });
    }

    // Apply product stock quantity to variants if variants exist
    if (variants.length > 0) {
      const variantData = variants.map((variant, index) => ({
        id: uuidv4(),
        productId: product.id,
        size: variant.size || 'N/A',
        color: variant.color || 'N/A',
        material: variant.material || 'N/A',
        price: variant.price || price,
        // No stockQuantity here, managed at Product level
        sku: `${slug}-${index + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      await ProductVariant.bulkCreate(variantData, { transaction: t });
    }
    // If no variants were provided, create a default variant with the product's stock
    else if (stockQuantity) {
      const defaultVariant = {
        id: uuidv4(),
        productId: product.id,
        size: 'N/A',
        color: 'N/A',
        material: 'N/A',
        price: price,
        stockQuantity: stockQuantity,
        sku: `${slug}-default`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await ProductVariant.create(defaultVariant, { transaction: t });
    }

    await t.commit();

    const result = await Product.findByPk(product.id, {
      include: [
        { model: Category, as: 'categories', through: { attributes: [] } },
        { model: ProductVariant, as: 'variants' },
        { model: ProductImage, as: 'images', attributes: ['id', 'displayOrder', 'isDefault', 'mimeType'] },
      ],
    });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const transformedResult = transformProductData(result, baseUrl);

    return ApiResponse.success(res, 'Product created successfully', transformedResult, 201);
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const product = await Product.findByPk(req.params.id, { paranoid: false });
    if (!product) {
      return ApiResponse.error(res, ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    const updatedData = { ...req.body };
    if (req.file) updatedData.featuredImage = req.file.buffer.toString('base64');
    if (updatedData.name) updatedData.slug = slugify(updatedData.name, { lower: true, strict: true });
    await product.update(updatedData, { transaction: t }); // stockQuantity updated here if provided

    if (req.body.categoryIds) {
      await ProductCategory.destroy({ where: { productId: product.id }, transaction: t });
      const productCategories = req.body.categoryIds.map((categoryId) => ({
        productId: product.id,
        categoryId,
        isPrimary: categoryId === req.body.categoryIds[0],
      }));
      await ProductCategory.bulkCreate(productCategories, { transaction: t });
    }

    // If stockQuantity is updated at product level, update it for all variants as well
    const stockQuantityUpdated = req.body.stockQuantity !== undefined;

    if (req.body.variants) {
      await ProductVariant.destroy({ where: { productId: product.id }, transaction: t });
      const variantData = req.body.variants.map((variant, index) => ({
        id: uuidv4(),
        id: uuidv4(),
        productId: product.id,
        size: variant.size || 'N/A',
        color: variant.color || 'N/A',
        material: variant.material || 'N/A',
        price: variant.price || product.price,
        // No stockQuantity here, managed at Product level
        sku: `${product.slug}-${index + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      await ProductVariant.bulkCreate(variantData, { transaction: t });
    }
    // If stockQuantity is updated but no variants are provided in the update
    else if (stockQuantityUpdated) {
      // Update stock quantity for all existing variants
      await ProductVariant.update(
        { stockQuantity: req.body.stockQuantity },
        {
          where: { productId: product.id },
          transaction: t,
        },
      );
    }

    await t.commit();

    const result = await Product.findByPk(product.id, {
      include: [
        { model: Category, as: 'categories', through: { attributes: [] } },
        { model: ProductVariant, as: 'variants' },
        { model: ProductImage, as: 'images', attributes: ['id', 'displayOrder', 'isDefault', 'mimeType'] },
      ],
    });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const transformedResult = transformProductData(result, baseUrl);

    return ApiResponse.success(res, 'Product updated successfully', transformedResult);
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id, { paranoid: false });
    if (!product) {
      return ApiResponse.error(res, ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }
    await product.destroy({ force: true });
    return ApiResponse.success(res, 'Product deleted', null, HTTP_STATUS_CODES.NO_CONTENT);
  } catch (error) {
    next(error);
  }
};

export const updateStock = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const product = await Product.findByPk(req.params.id, { paranoid: false });
    if (!product) {
      return ApiResponse.error(res, ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }
    const { stockQuantity } = req.body;
    if (stockQuantity === undefined || stockQuantity < 0) {
      return ApiResponse.error(res, 'Invalid stock quantity', HTTP_STATUS_CODES.BAD_REQUEST);
    }
    await product.update({ stockQuantity }, { transaction: t });
    await t.commit();

    const updatedProduct = await Product.findByPk(product.id, {
      include: [
        { model: ProductVariant, as: 'variants' },
        { model: ProductImage, as: 'images', attributes: ['id', 'displayOrder', 'isDefault', 'mimeType'] },
      ],
    });
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const transformedProduct = transformProductData(updatedProduct, baseUrl);

    return ApiResponse.success(res, 'Stock updated successfully', transformedProduct);
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

export const archiveProduct = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id, { paranoid: false });
    if (!product) {
      return ApiResponse.error(res, ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }
    await product.update({ isActive: PRODUCT_STATUS.ARCHIEVED });
    return ApiResponse.success(res, 'Product archived successfully', product);
  } catch (error) {
    next(error);
  }
};

export const restoreProduct = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id, { paranoid: false });
    if (!product) {
      return ApiResponse.error(res, ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }
    await product.restore();
    return ApiResponse.success(res, 'Product restored successfully', product);
  } catch (error) {
    next(error);
  }
};

export const getProductImage = async (req, res, next) => {
  try {
    const { imageId } = req.params;
    const image = await ProductImage.findByPk(imageId);

    if (!image) {
      return ApiResponse.error(res, 'Image not found', 404);
    }

    const imageBuffer = Buffer.from(image.imageData, 'base64');
    res.set('Content-Type', image.mimeType);
    res.set('Cache-Control', 'public, max-age=31557600');
    return res.send(imageBuffer);
  } catch (error) {
    next(error);
  }
};

export const getAllProducts = async (req, res, next) => {
  try {
    const {
      limit = 10,
      offset = 0,
      categoriesId,
      isActive = PRODUCT_STATUS.ACTIVE,
      minPrice,
      maxPrice,
      sort = 'createdAt_desc',
    } = req.query;
    const where = {};

    if (isActive) where.isActive = isActive;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }

    let order = [['createdAt', 'DESC']];
    if (sort === 'price_asc') order = [['price', 'ASC']];
    if (sort === 'price_desc') order = [['price', 'DESC']];

    const products = await Product.findAll({
      where,
      include: [
        { model: Category, as: 'categories', through: { attributes: [] } },
        { model: ProductVariant, as: 'variants' },
        {
          model: ProductImage,
          as: 'images',
          attributes: ['id', 'displayOrder', 'isDefault', 'mimeType'],
          order: [['displayOrder', 'ASC']],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order,
      paranoid: false,
    });

    const total = await Product.count({ where });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const transformedProducts = products.map((product) => transformProductData(product, baseUrl));

    return ApiResponse.success(res, 'Products retrieved', {
      products: transformedProducts,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: Category, as: 'categories', through: { attributes: [] } },
        { model: ProductVariant, as: 'variants' },
        {
          model: ProductImage,
          as: 'images',
          attributes: ['id', 'displayOrder', 'isDefault', 'mimeType'],
          order: [['displayOrder', 'ASC']],
        },
      ],
      paranoid: false,
    });

    if (!product) {
      return ApiResponse.error(res, ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const transformedProduct = transformProductData(product, baseUrl);

    return ApiResponse.success(res, 'Product details', transformedProduct);
  } catch (error) {
    next(error);
  }
};

export const getProductsByCategory = async (req, res, next) => {
  try {
    const { limit = 10, offset = 0, isActive = true, sort = 'createdAt_desc' } = req.query;
    let order = [['createdAt', 'DESC']];
    if (sort === 'price_asc') order = [['price', 'ASC']];
    if (sort === 'price_desc') order = [['price', 'DESC']];

    const products = await Product.findAll({
      include: [
        {
          model: Category,
          as: 'categories',
          where: { id: req.params.id, ...(isActive ? { isActive } : {}) },
          through: { attributes: [] },
          paranoid: false,
        },
        { model: ProductVariant, as: 'variants' },
        {
          model: ProductImage,
          as: 'images',
          attributes: ['id', 'displayOrder', 'isDefault', 'mimeType'],
          order: [['displayOrder', 'ASC']],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order,
    });

    const total = await Product.count({
      include: [
        {
          model: Category,
          as: 'categories',
          where: { id: req.params.id, ...(isActive ? { isActive } : {}) },
          paranoid: false,
        },
      ],
    });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const transformedProducts = products.map((product) => transformProductData(product, baseUrl));

    return ApiResponse.success(res, 'Products by category', {
      products: transformedProducts,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    next(error);
  }
};
