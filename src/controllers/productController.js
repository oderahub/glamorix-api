import { Product, ProductCategory, Category } from '../models/index.js';
import ApiResponse from '../utils/ApiResponse.js';
import { HTTP_STATUS_CODES, ERROR_MESSAGES, PRODUCT_STATUS } from '../constants/constant.js';
import slugify from 'slugify';

export const createProduct = async (req, res, next) => {
    try {
        const {
            name,
            description,
            price,
            discountPercentage,
            stockQuantity,
            sku,
            isActive,
            categoryIds = []
        } = req.body;
        const featuredImage = req.file ? req.file.buffer.toString('base64') : null;

        const slug = slugify(name, { lower: true, strict: true });

        const product = await Product.create({
            name,
            slug,
            description,
            price,
            discountPercentage,
            stockQuantity,
            sku,
            isActive: isActive !== undefined ? isActive : PRODUCT_STATUS.ACTIVE,
            featuredImage
        });

        if (categoryIds.length > 0) {
            const productCategories = categoryIds.map(categoryId => ({
                productId: product.id,
                categoryId,
                isPrimary: categoryId === categoryIds[0]
            }));
            await ProductCategory.bulkCreate(productCategories);
        }

        const result = await Product.findByPk(product.id, {
            include: [{ model: Category, as: 'categories', through: { attributes: [] } }]
        });
        return ApiResponse.success(res, 'Product created successfully', result, HTTP_STATUS_CODES.CREATED);
    } catch (error) {
        next(error);
    }
};

export const updateProduct = async (req, res, next) => {
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
        await product.update(updatedData);

        if (req.body.categoryIds) {
            await ProductCategory.destroy({ where: { productId: product.id } });
            const productCategories = req.body.categoryIds.map(categoryId => ({
                productId: product.id,
                categoryId,
                isPrimary: categoryId === req.body.categoryIds[0]
            }));
            await ProductCategory.bulkCreate(productCategories);
        }

        const result = await Product.findByPk(product.id, {
            include: [{ model: Category, as: 'categories', through: { attributes: [] } }]
        });
        return ApiResponse.success(res, 'Product updated successfully', result);
    } catch (error) {
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
    try {
        const product = await Product.findByPk(req.params.id, { paranoid: false });
        if (!product) {
            return ApiResponse.error(res, ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
        }
        const { stockQuantity } = req.body;
        await product.update({ stockQuantity });
        return ApiResponse.success(res, 'Stock updated successfully', product);
    } catch (error) {
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