import { Product, ProductCategory, Category, ProductVariant } from '../models/index.js';
import ApiResponse from '../utils/ApiResponse.js';
import { HTTP_STATUS_CODES, ERROR_MESSAGES, PRODUCT_STATUS } from '../constants/constant.js';
import slugify from 'slugify';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';


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
            variants = []
        } = req.body;
        const featuredImage = req.file ? req.file.buffer.toString('base64') : null;

        const slug = slugify(name, { lower: true, strict: true });

        const product = await Product.create(
            {
                name,
                slug,
                description,
                price,
                discountPercentage,
                stockQuantity: 0,
                sku,
                isActive: isActive !== undefined ? isActive : PRODUCT_STATUS.ACTIVE,
                featuredImage
            },
            { transaction: t }
        );

        if (categoryIds.length > 0) {
            const productCategories = categoryIds.map(categoryId => ({
                productId: product.id,
                categoryId,
                isPrimary: categoryId === categoryIds[0]
            }));
            await ProductCategory.bulkCreate(productCategories, { transaction: t });
        }

        // Create variants dynamically
        if (variants.length > 0) {
            const variantData = variants.map((variant, index) => ({
                id: uuidv4(), // Generate UUID using uuid library
                productId: product.id,
                size: variant.size || 'N/A',
                color: variant.color || 'N/A',
                material: variant.material || 'N/A',
                price: variant.price || price,
                stockQuantity: variant.stockQuantity || 0,
                sku: `${slug}-${index + 1}`,
                createdAt: new Date(),
                updatedAt: new Date()
            }));
            await ProductVariant.bulkCreate(variantData, { transaction: t });
        }

        await t.commit();

        const result = await Product.findByPk(product.id, {
            include: [
                { model: Category, as: 'categories', through: { attributes: [] } },
                { model: ProductVariant, as: 'variants' }
            ]
        });
        return ApiResponse.success(res, 'Product created successfully', result, HTTP_STATUS_CODES.CREATED);
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
        if (req.file) {
            updatedData.featuredImage = req.file.buffer.toString('base64');
        }
        if (updatedData.name) {
            updatedData.slug = slugify(updatedData.name, { lower: true, strict: true });
        }
        await product.update(updatedData, { transaction: t });

        if (req.body.categoryIds) {
            await ProductCategory.destroy({ where: { productId: product.id }, transaction: t });
            const productCategories = req.body.categoryIds.map(categoryId => ({
                productId: product.id,
                categoryId,
                isPrimary: categoryId === req.body.categoryIds[0]
            }));
            await ProductCategory.bulkCreate(productCategories, { transaction: t });
        }

        if (req.body.variants) {
            await ProductVariant.destroy({ where: { productId: product.id }, transaction: t });
            const variantData = req.body.variants.map((variant, index) => ({
                id: uuidv4(), // Generate UUID
                productId: product.id,
                size: variant.size || 'N/A',
                color: variant.color || 'N/A',
                material: variant.material || 'N/A',
                price: variant.price || product.price,
                stockQuantity: variant.stockQuantity || 0,
                sku: `${product.slug}-${index + 1}`,
                createdAt: new Date(),
                updatedAt: new Date()
            }));
            await ProductVariant.bulkCreate(variantData, { transaction: t });
        }

        await t.commit();

        const result = await Product.findByPk(product.id, {
            include: [
                { model: Category, as: 'categories', through: { attributes: [] } },
                { model: ProductVariant, as: 'variants' }
            ]
        });
        return ApiResponse.success(res, 'Product updated successfully', result);
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
        await product.destroy();
        return ApiResponse.success(res, 'Product deleted', null, HTTP_STATUS_CODES.NO_CONTENT);
    } catch (error) {
        next(error);
    }
};

export const updateStock = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { variantId } = req.query;
        if (!variantId) {
            return ApiResponse.error(res, 'variantId is required', HTTP_STATUS_CODES.BAD_REQUEST);
        }
        const product = await Product.findByPk(req.params.id, { paranoid: false });
        if (!product) {
            return ApiResponse.error(res, ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
        }
        const productVariant = await ProductVariant.findOne({ where: { id: variantId, productId: product.id }, transaction: t });
        if (!productVariant) {
            return ApiResponse.error(res, 'Product variant not found', HTTP_STATUS_CODES.NOT_FOUND);
        }
        const { stockQuantity } = req.body;
        await productVariant.update({ stockQuantity }, { transaction: t });
        await t.commit();
        return ApiResponse.success(res, 'Stock updated successfully', productVariant);
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